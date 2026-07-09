import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FaUpload, FaTrash, FaEye, FaToggleOn, FaToggleOff, FaFileAlt, FaFilePdf, FaFileCsv, FaGlobe, FaRobot } from 'react-icons/fa';

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
      const response = await api.get('/knowledge-base');
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

    try {
      setUploadProgress('Uploading and processing...');
      
      const response = await api.post('/knowledge-base', formData, {
        headers: {
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
    try {
      await api.put(
        `/knowledge-base/${id}`,
        { isActive: !currentStatus }
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
    
    try {
      await api.delete(`/knowledge-base/${id}`);
      fetchKnowledgeBases();
      alert('Knowledge base deleted successfully');
    } catch (error) {
      alert('Failed to delete knowledge base');
    }
  };

  const handleTestQuery = async (e) => {
    e.preventDefault();

    try {
      setTestLoading(true);
      setTestResult(null);

      const response = await api.post(
        '/knowledge-base/query',
        { question: testQuestion }
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
        <div className="page-header-info">
          <h1 className="page-title">AI Knowledge Base</h1>
          <p className="page-subtitle">Upload FAQs and documents for AI-powered responses</p>
        </div>
        <div className="page-header-actions">
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowTestQuery(!showTestQuery)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaRobot /> Test Knowledge
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowUploadForm(!showUploadForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaUpload /> Upload Document
          </button>
        </div>
      </div>

      {/* Premium Onboarding FAQ Template Banner */}
      <div style={{
        background: 'rgba(22, 163, 74, 0.06)',
        border: '1px solid rgba(22, 163, 74, 0.15)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        flexWrap: 'wrap',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ flex: 1, minWidth: '280px', textAlign: 'left' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📝 Ready-Made Sample Store FAQ PDF Template
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
            We have pre-loaded a professional <strong>Sample Store FAQ Template</strong> PDF into your Knowledge Base. This shows the correct formatting of return windows, shipping rates, and support details to ensure high-accuracy responses from the AI. Download it below to use as a template.
          </p>
        </div>
        <a 
          href="/docs/sample_store_faq_template.pdf" 
          download="Sample_Store_FAQ_Template.pdf"
          className="btn btn-primary"
          style={{
            padding: '10px 18px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <FaFilePdf /> Download FAQ Template
        </a>
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
                <li><strong>CSV files:</strong> Tabular Q&A data or product lists</li>
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
                accept=".pdf,.txt,.csv"
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
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            Loading knowledge bases...
          </div>
        ) : knowledgeBases.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>No Knowledge Base</h3>
            <p style={{ fontSize: '14px', marginBottom: '20px' }}>Upload FAQs or documentation to train your WhatsApp AI assistant.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowUploadForm(true)}
            >
              Upload Document
            </button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Document / Title</th>
                <th>Type</th>
                <th>Size</th>
                <th>Character Count</th>
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
                      {kb.fileType === 'pdf' ? (
                        <FaFilePdf color="#ef4444" />
                      ) : kb.fileType === 'csv' ? (
                        <FaFileCsv color="var(--brand)" />
                      ) : kb.fileType === 'url' ? (
                        <FaGlobe color="#3b82f6" />
                      ) : (
                        <FaFileAlt color="var(--text-muted)" />
                      )}
                      <div>
                        <strong>{kb.title}</strong>
                        {kb.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {kb.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${kb.fileType === 'pdf' ? 'urgent' : kb.fileType === 'csv' ? 'active' : kb.fileType === 'url' ? 'low' : 'cancelled'}`}>
                      {kb.fileType.toUpperCase()}
                    </span>
                  </td>
                  <td>{formatFileSize(kb.fileSize)}</td>
                  <td>{kb.textLength.toLocaleString()} chars</td>
                  <td>
                    <span className={`badge ${kb.isActive ? 'badge-active' : 'badge-cancelled'}`}>
                      {kb.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{kb.uploadedByName}</td>
                  <td>{new Date(kb.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {kb.fileName === 'sample_store_faq_template.pdf' && (
                        <a
                          href="/docs/sample_store_faq_template.pdf"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          style={{ 
                            fontSize: '12.5px', 
                            padding: '6px 12px', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            textDecoration: 'none'
                          }}
                          title="View PDF"
                        >
                          <FaEye style={{ marginRight: '4px' }} /> View
                        </a>
                      )}
                      <button
                        onClick={() => handleToggleActive(kb._id, kb.isActive)}
                        className="btn btn-secondary"
                        style={{ fontSize: '12.5px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center' }}
                        title={kb.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {kb.isActive ? <FaToggleOn /> : <FaToggleOff />}
                      </button>
                      <button
                        onClick={() => handleDelete(kb._id)}
                        className="btn btn-danger"
                        style={{ fontSize: '12.5px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center' }}
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
