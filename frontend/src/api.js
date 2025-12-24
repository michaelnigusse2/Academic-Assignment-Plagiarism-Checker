import axios from 'axios';
import { getToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add interceptor to add token to all axios requests if needed, 
// OR just modify uploadAssignment as requested.
// The user request explicitly showed modifying uploadAssignment with fetch, 
// but my api.js uses axios. I should adapt the user's intent to my axios implementation 
// OR switch to fetch. Stick to axios + token header to keep it consistent with the file, 
// but ensure the logic matches the requirement.

export const uploadAssignment = async (file) => {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const analyzeAssignment = async (assignmentId) => {
  const token = getToken();
  try {
    const response = await api.post('/analyze-assignment',
      { assignment_id: assignmentId },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error analyzing assignment:', error);
    throw error;
  }
};

