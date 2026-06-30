import { streamText } from 'ai';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function main() {
  const result = streamText({
    model: 'openai/gpt-5.4',
    prompt: 'Invent a new holiday and describe its traditions.',
  });

  for await (const textPart of result.textStream) {
    process.stdout.write(textPart);
  }

  console.log();
  console.log('Token usage:', await result.usage);
}

main().catch(console.error);
