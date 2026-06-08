import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUpload, FaTrash, FaEye, FaToggleOn, FaToggleOff, FaFileAlt, FaFilePdf, FaRobot } from 'react-icons/fa';

function KnowledgeBase() {
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showTestQuery, setShowTestQuery] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [testQuestion, setTestQuestion] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  const fetchKnowledgeBases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/knowledge-base', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKnowledgeBases(response.data.data);
    } catch (error) {
      console.error('Error fetching knowledge bases:', error);
      alert('Failed to load knowledge bases');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const token = localStorage.getItem('token');

    try {
      setUploadProgress('Uploading and processing...');
      
      const response = await axios.post('http://localhost:5001/api/knowledge-base', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setShowUploadForm(false);
        setUploadProgress(null);
        fetchKnowledgeBases();
        alert('Knowledge base uploaded successfully!');
        e.target.reset();
      }
    } catch (error) {
      setUploadProgress(null);
      alert(error.response?.data?.error || 'Failed to upload file');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    const token = localStorage.getItem('token');
    
    try {
      await axios.put(
        `http://localhost:5001/api/knowledge-base/${id}`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchKnowledgeBases();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this knowledge base?')) {
      return;
    }

    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`http://localhost:5001/api/knowledge-base/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchKnowledgeBases();
      alert('Knowledge base deleted successfully');
    } catch (error) {
      alert('Failed to delete knowledge base');
    }
  };

  const handleTestQuery = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      setTestLoading(true);
      setTestResult(null);

      const response = await axios.post(
        'http://localhost:5001/api/knowledge-base/query',
        { question: testQuestion },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTestResult(response.data.data);
    } catch (error) {
      alert('Failed to query knowledge base');
    } finally {
      setTestLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="container">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">🧠 AI Knowledge Base</h1>
            <p className="page-subtitle">Upload FAQs and documents for AI-powered responses</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-secondary" 
              onClick={() => setShowTestQuery(!showTestQuery)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaRobot /> Test Query
            </button>
            <button 
              className="btn-primary" 
              onClick={() => setShowUploadForm(!showUploadForm)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaUpload /> Upload Document
            </button>
          </div>
        </div>
      </div>

      {/* Test Query Form */}
      {showTestQuery && (
        <div className="table-container" style={{ marginBottom: '28px', background: 'rgba(16, 185, 129, 0.05)' }}>
          <div className="table-header" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)' }}>
            <h2>🤖 Test Knowledge Base Query</h2>
          </div>
          <form onSubmit={handleTestQuery} style={{ padding: '28px' }}>
            <div className="filter-group" style={{ marginBottom: '20px' }}>
              <label>Ask a Question</label>
              <textarea
                value={testQuestion}
                onChange={(e) => setTestQuestion(e.target.value)}
                placeholder="e.g., What is your return policy?"
                rows="3"
                required
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '1px solid rgba(63, 63, 70, 0.5)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  background: 'rgba(39, 39, 42, 0.6)',
                  color: '#fafafa',
                  fontFamily: 'Inter, sans-serif',
                  resize: 'vertical'
                }}
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary"
              disabled={testLoading}
              style={{ marginBottom: '20px' }}
            >
              {testLoading ? 'Querying...' : 'Ask AI'}
            </button>

            {testResult && (
              <div style={{
                background: testResult.foundInKB ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${testResult.foundInKB ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '20px' }}>{testResult.foundInKB ? '✅' : '❌'}</span>
                  <strong style={{ color: '#fafafa' }}>
                    {testResult.foundInKB ? 'Answer Found in Knowledge Base' : 'Not Found in Knowledge Base'}
                  </strong>
                </div>
                <p style={{ color: '#d4d4d8', lineHeight: '1.6', margin: 0 }}>
                  {testResult.answer}
                </p>
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#71717a' }}>
                  Confidence: {(testResult.confidence * 100).toFixed(0)}%
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <div className="table-container" style={{ marginBottom: '28px' }}>
          <div className="table-header">
            <h2>📤 Upload Knowledge Base Document</h2>
          </div>
          <form onSubmit={handleUpload} style={{ padding: '28px' }} encType="multipart/form-data">
            <div style={{ 
              background: 'rgba(99, 102, 241, 0.1)', 
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <h3 style={{ color: '#a5b4fc', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                📋 Supported Formats:
              </h3>
              <ul style={{ color: '#a1a1aa', fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
                <li><strong>PDF files:</strong> Business FAQs, policies, product catalogs</li>
                <li><strong>TXT files:</strong> Plain text documents with Q&A</li>
                <li><strong>Max size:</strong> 10MB per file</li>
                <li><strong>Best practice:</strong> Use clear, structured content with questions and answers</li>
              </ul>
            </div>

            <div className="filter-group" style={{ marginBottom: '20px' }}>
              <label>Title *</label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g., Return Policy FAQs"
              />
            </div>

            <div className="filter-group" style={{ marginBottom: '20px' }}>
              <label>Description</label>
              <textarea
                name="description"
                placeholder="Brief description of what this document contains..."
                rows="3"
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '1px solid rgba(63, 63, 70, 0.5)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  background: 'rgba(39, 39, 42, 0.6)',
                  color: '#fafafa',
                  fontFamily: 'Inter, sans-serif',
                  resize: 'vertical'
                }}
              />
            </div>

            <div className="filter-group" style={{ marginBottom: '24px' }}>
              <label>Select File *</label>
              <input 
                type="file" 
                name="file" 
                accept=".pdf,.txt"
                required
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '2px dashed rgba(99, 102, 241, 0.5)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  background: 'rgba(39, 39, 42, 0.6)',
                  color: '#fafafa',
                  cursor: 'pointer'
                }}
              />
            </div>

            {uploadProgress && (
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '12px 16px',
                borderRadius: '10px',
                color: '#a5b4fc',
                fontSize: '14px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {uploadProgress}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={uploadProgress !== null}
              >
                {uploadProgress ? 'Processing...' : 'Upload & Process'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowUploadForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Knowledge Bases List */}
      <div className="table-container">
        <div className="table-header">
          <h2>Uploaded Documents ({knowledgeBases.length})</h2>
        </div>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            Loading knowledge bases...
          </div>
        ) : knowledgeBases.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <p>No knowledge base documents uploaded yet.</p>
            <p style={{ fontSize: '14px' }}>Upload your first document to get started!</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Size</th>
                <th>Text Length</th>
                <th>Status</th>
                <th>Uploaded By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {knowledgeBases.map((kb) => (
                <tr key={kb._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {kb.fileType === 'pdf' ? <FaFilePdf color="#ef4444" /> : <FaFileAlt color="#10b981" />}
                      <div>
                        <strong>{kb.title}</strong>
                        {kb.description && (
                          <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>
                            {kb.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ background: kb.fileType === 'pdf' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)' }}>
                      {kb.fileType.toUpperCase()}
                    </span>
                  </td>
                  <td>{formatFileSize(kb.fileSize)}</td>
                  <td>{kb.textLength.toLocaleString()} chars</td>
                  <td>
                    <span className={`badge ${kb.isActive ? 'badge-delivered' : 'badge-cancelled'}`}>
                      {kb.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{kb.uploadedByName}</td>
                  <td>{new Date(kb.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleToggleActive(kb._id, kb.isActive)}
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        title={kb.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {kb.isActive ? <FaToggleOn /> : <FaToggleOff />}
                      </button>
                      <button
                        onClick={() => handleDelete(kb._id)}
                        className="btn btn-danger"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default KnowledgeBase;
