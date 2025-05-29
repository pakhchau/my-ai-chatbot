import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

const client = postgres(process.env.POSTGRES_URL!);

async function runMigration() {
  try {
    console.log('🔄 Running HCC authentication migration...');
    
    const migrationSQL = readFileSync(
      join(__dirname, 'lib/db/migrations/0008_hcc_authentication.sql'),
      'utf-8'
    );
    
    // Split by semicolon and run each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await client.unsafe(statement);
        console.log('✅ Executed:', statement.substring(0, 50) + '...');
      } catch (error: any) {
        if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
          console.log('⚠️  Skipped (already exists):', statement.substring(0, 50) + '...');
        } else {
          console.error('❌ Error:', error.message);
          console.error('Statement:', statement);
        }
      }
    }
    
    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration(); 