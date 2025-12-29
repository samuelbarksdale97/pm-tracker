import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
}

console.log('Using API key ending in:', apiKey.slice(-10));

const anthropic = new Anthropic({
    apiKey,
});

async function main() {
    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 100,
            messages: [{ role: 'user', content: 'Say hello in 5 words' }],
        });

        console.log('Response:', response.content);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
