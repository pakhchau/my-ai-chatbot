import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { generateUUID, getTrailingMessageId } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { executeSql } from '@/lib/ai/tools/execute-sql';
import { generateTableTool } from '@/lib/ai/tools/generate-table';
import { getUserId } from '@/lib/ai/tools/get-user-id';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import type { Chat } from '@/lib/db/schema';
import { differenceInSeconds } from 'date-fns';
import { ChatSDKError } from '@/lib/errors';
import { getDatabaseSchema } from '@/lib/ai/tools/get-database-schema';
import { getTableSchema } from '@/lib/ai/tools/get-table-schema';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const { id, message, selectedChatModel, selectedVisibilityType } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    // RATE LIMITING DISABLED FOR TESTING
    /*
    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }
    */

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const previousMessages = await getMessagesByChatId({ id });

    const messages = appendClientMessage({
      // @ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
      messages: previousMessages,
      message,
    });

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const stream = createDataStream({
      execute: (dataStream) => {
        // Configure tools based on selected model
        const isTableTestModel = selectedChatModel === 'table-test-model';
        
        console.log('🤖 Starting AI chat with tools:', isTableTestModel 
          ? ['generateTable']
          : [
              'getWeather',
              'createDocument', 
              'updateDocument',
              'requestSuggestions',
              'executeSql',
              'getDatabaseSchema',
              'getTableSchema',
              'generateTable',
              'getUserId'
            ]);
        
        let tools;
        if (isTableTestModel) {
          console.log('🧪 TABLE TEST MODEL DETECTED - Only generateTable tool available');
          console.log('🎯 Table Test Model Prompt will be used');
          console.log('🔧 Available tools for Table Test Model:', ['generateTable']);
          tools = {
            generateTable: generateTableTool,
          };
        } else {
          console.log('🔧 REGULAR MODEL - All tools available including generateTable');
          tools = {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
            executeSql: executeSql({ session }),
            getDatabaseSchema: getDatabaseSchema({ session }),
            getTableSchema: getTableSchema({ session }),
            generateTable: generateTableTool,
            getUserId: getUserId({ session }),
          };
        }
        
        console.log('🛠️ Available tools:', Object.keys(tools));
        console.log('🤖 Selected model:', selectedChatModel);
        console.log('🧪 Is table test model?', isTableTestModel);
        
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages,
          maxSteps: 10,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools,
          onStepFinish: ({ stepType, toolCalls, toolResults }) => {
            console.log('🔄 STEP FINISHED');
            console.log('📊 Step type:', stepType);
            console.log('🔧 Tool calls count:', toolCalls?.length || 0);
            console.log('📋 Tool results count:', toolResults?.length || 0);
            
            if (toolCalls && toolCalls.length > 0) {
              console.log('🔧 TOOL STEP DETECTED!');
              console.log('📞 Tool calls:', toolCalls?.map(tc => tc.toolName));
              console.log('📊 Tool results count:', toolResults?.length);
              console.log('🔄 Step type:', stepType);
              
              // Log each tool call in detail
              toolCalls.forEach((toolCall, index) => {
                console.log(`🔧 Tool Call ${index + 1}:`);
                console.log(`  - Name: ${toolCall.toolName}`);
                console.log(`  - Args:`, JSON.stringify(toolCall.args, null, 2));
              });
              
              // Log each tool result in detail
              if (toolResults) {
                toolResults.forEach((result: any, index) => {
                  console.log(`📊 Tool Result ${index + 1}:`);
                  console.log(`  - Tool: ${result.toolName}`);
                  console.log(`  - Success:`, result.result ? 'Yes' : 'No');
                  if (result.toolName === 'generateTable') {
                    console.log('🎯 GENERATE TABLE RESULT DETECTED!');
                    console.log('📊 Table result:', JSON.stringify(result.result, null, 2));
                  }
                });
              }
              
              // Log if this was a successful SQL query that should trigger table generation
              if (!isTableTestModel) {
                const sqlCalls = toolCalls.filter(tc => tc.toolName === 'executeSql');
                if (sqlCalls.length > 0 && toolResults) {
                  const sqlResults = toolResults.filter((tr: any) => tr.toolName === 'executeSql');
                  sqlResults.forEach((result: any) => {
                    if (result.result?.success && 'data' in result.result && result.result.data?.rowCount && result.result.data.rowCount > 0) {
                      console.log('🚨 SUCCESSFUL SQL QUERY WITH DATA - SHOULD TRIGGER TABLE GENERATION!');
                      console.log('📊 Rows returned:', result.result.data.rowCount);
                      console.log('✅ generateTable tool IS available in regular models!');
                    }
                  });
                }
              }
            } else {
              console.log('❌ No tool calls in this step');
            }
          },
          onFinish: async ({ response, toolCalls, toolResults }) => {
            console.log('🏁 Chat finished');
            console.log('🤖 Model used:', selectedChatModel);
            console.log('🧪 Was Table Test Model?', isTableTestModel);
            if (toolCalls && toolCalls.length > 0) {
              console.log('🔧 Tools used in this conversation:', toolCalls.map(tc => tc.toolName));
            } else {
              console.log('❌ NO TOOLS WERE CALLED AT ALL!');
              if (isTableTestModel) {
                console.log('🚨 TABLE TEST MODEL FINISHED WITHOUT CALLING generateTable!');
                console.log('📝 This suggests the AI is not following the table test prompt correctly');
              }
            }
            
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [message],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (_) {
                console.error('Failed to save chat');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () => stream),
      );
    } else {
      return new Response(stream);
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  let chat: Chat;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
