async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/youtube/live-chat-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoUrlOrId: 'E16_GqcBH2g',
        apiKey: 'dummy_key'
      })
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
