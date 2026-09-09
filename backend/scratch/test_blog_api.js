const axios = require('axios');

async function testApi() {
  try {
    const res = await axios.get('http://127.0.0.1:5001/api/blog');
    console.log('GET /api/blog Response Status:', res.status);
    console.log('Success:', res.data.success);
    console.log('Blogs Count:', res.data.count);
    if (res.data.data) {
      res.data.data.forEach(b => {
        console.log(' - Title:', b.title);
        console.log('   Slug:', b.slug);
        console.log('   CoverImage:', b.coverImage);
      });
    }
  } catch (err) {
    console.log('Error testing API:', err.message);
  }
}
testApi();
