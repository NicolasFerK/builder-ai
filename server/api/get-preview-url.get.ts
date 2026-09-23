import { defineEventHandler } from 'h3';

export default defineEventHandler(() => {
  return {
    url: 'http://localhost:5173'
  };
});
