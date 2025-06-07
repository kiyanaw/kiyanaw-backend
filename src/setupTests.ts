import '@testing-library/jest-dom';

jest.mock('aws-amplify/storage', () => ({
  getUrl: jest.fn((options: { path: string }) => {
    // Return a resolved promise with a fake URL object
    return Promise.resolve({
      url: new URL(`https://fake.s3.amazonaws.com/${options.path}`),
      expiresAt: new Date(Date.now() + 3600 * 1000), // Expires in 1 hour
    });
  }),
  getProperties: jest.fn((options: { path: string }) => {
    // Return a resolved promise with fake properties
    if (options.path.endsWith('.json')) {
      // It's a request for the peaks file
      return Promise.resolve({
        // Mock properties for the JSON peaks file
        contentType: 'application/json',
        size: 12345,
      });
    }
    // It's a request for the media file
    return Promise.resolve({
      contentType: 'video/mp4', // or 'audio/mp3' etc.
      size: 987654,
    });
  }),
  // Mock any other storage functions if your code uses them
})); 