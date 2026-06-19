const axios = require('axios');

const keyId = 'rzp_test_T3N9tkF8F08EYS';
const baseSecret = '3u8Mu1P32UF272wKmI42o8tE';

// Define the substitutions for positions (0-indexed)
// '3u8Mu1P32UF272wKmI42o8tE'
// Indices:
// 3: 0, u: 1, 8: 2, M: 3, u: 4, 1: 5, P: 6, 3: 7, 2: 8, U: 9, F: 10, 2: 11, 7: 12, 2: 13, w: 14, K: 15, m: 16, I: 17, 4: 18, 2: 19, o: 20, 8: 21, t: 22, E: 23
// Target characters:
// Index 5: '1' -> '1', 'l', 'I'
// Index 17: 'I' -> 'I', 'l', '1'
// Index 20: 'o' -> 'o', 'O', '0'

const substs = {
  5: ['1', 'l', 'I'],
  17: ['I', 'l', '1'],
  20: ['o', 'O', '0']
};

async function checkSecret(secret) {
  const auth = Buffer.from(`${keyId}:${secret}`).toString('base64');
  try {
    const res = await axios.get('https://api.razorpay.com/v1/orders', {
      headers: {
        Authorization: `Basic ${auth}`
      }
    });
    return { success: true, status: res.status };
  } catch (error) {
    if (error.response && error.response.status === 401) {
      return { success: false, status: 401 };
    }
    // Any other error (e.g. 400 or 403 or network error) means auth succeeded but request failed or other issue
    return { success: true, status: error.response ? error.response.status : error.message };
  }
}

async function run() {
  const chars = baseSecret.split('');
  const combinations = [];

  const opt5 = substs[5];
  const opt17 = substs[17];
  const opt20 = substs[20];

  for (const c5 of opt5) {
    for (const c17 of opt17) {
      for (const c20 of opt20) {
        const testChars = [...chars];
        testChars[5] = c5;
        testChars[17] = c17;
        testChars[20] = c20;
        combinations.push(testChars.join(''));
      }
    }
  }

  console.log(`Generated ${combinations.length} combinations to test.`);

  for (const secret of combinations) {
    process.stdout.write(`Testing: ${secret} ... `);
    const result = await checkSecret(secret);
    if (result.success) {
      console.log(`\n\n🎉 FOUND SUCCESSFUL SECRET: ${secret} (Status: ${result.status})`);
      return;
    } else {
      console.log('Failed');
    }
  }

  console.log('\n❌ None of the basic permutations worked.');
}

run();
