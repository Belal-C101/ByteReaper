// Test OpenRouter API connection
// Run with: node test-api.js

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = 'API HERE';

// Verified FREE models on OpenRouter (March 2026)
const MODELS = [
  'openrouter/free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'minimax/minimax-m2.5:free',
  'stepfun/step-3.5-flash:free',
  'arcee-ai/trinity-large-preview:free',
  'liquid/lfm-2.5-1.2b-thinking:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
];

async function testModel(modelId) {
  console.log(`\nTesting: ${modelId}`);
  
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'ByteReaper Test',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'Say hello in 5 words' }],
        max_tokens: 50,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.log(`  ❌ Error ${response.status}: ${JSON.stringify(data.error || data)}`);
      return false;
    }

    const content = data.choices?.[0]?.message?.content;
    if (content) {
      console.log(`  ✅ Response: "${content.slice(0, 100)}"`);
      return true;
    } else {
      console.log(`  ⚠️ No content in response:`, JSON.stringify(data).slice(0, 200));
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Fetch error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('=== OpenRouter API Test ===');
  console.log('Testing connection to OpenRouter...\n');

  let working = 0;
  let failed = 0;

  for (const model of MODELS) {
    const success = await testModel(model);
    if (success) working++;
    else failed++;
  }

  console.log(`\n=== Results ===`);
  console.log(`Working: ${working}/${MODELS.length}`);
  console.log(`Failed: ${failed}/${MODELS.length}`);
}

main();
