import { useState } from 'react';
import { createProduct } from './api';

function App() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);

    if (!name.trim() || !description.trim()) {
      setError('Name and description are required.');
      return;
    }

    try {
      setLoading(true);
      const response = await createProduct({
        name: name.trim(),
        description: description.trim(),
      });
      setResult(response.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const aiData = result?.aiData;

  return (
    <main className="container">
      <h1>AI Auto-Category & Tag Generator</h1>

      <form onSubmit={handleSubmit} className="card">
        <label>
          Product Name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter product name"
          />
        </label>

        <label>
          Product Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            placeholder="Enter product description"
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate AI Data'}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {aiData ? (
        <section className="card">
          <h2>Structured JSON Output</h2>
          <p>
            <strong>Primary Category:</strong> {aiData.primary_category}
          </p>
          <p>
            <strong>Sub Category:</strong> {aiData.sub_category}
          </p>
          <p>
            <strong>SEO Tags:</strong> {aiData.seo_tags.join(', ')}
          </p>
          <p>
            <strong>Sustainability Filters:</strong>{' '}
            {aiData.sustainability_filters.join(', ') || 'None'}
          </p>
          <pre>{JSON.stringify(aiData, null, 2)}</pre>
        </section>
      ) : null}
    </main>
  );
}

export default App;
