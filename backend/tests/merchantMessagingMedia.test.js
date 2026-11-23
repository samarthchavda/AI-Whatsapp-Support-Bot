jest.mock('axios');

const axios = require('axios');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');

describe('merchant WhatsApp media sending', () => {
  beforeEach(() => jest.clearAllMocks());

  test('uploads a file and sends its media id from the selected merchant number', async () => {
    axios.post
      .mockResolvedValueOnce({ data: { id: 'media-123' } })
      .mockResolvedValueOnce({ data: { messages: [{ id: 'wamid-123' }] } });

    const sent = await whatsappCloudAPI.sendMedia(
      '+919876543210',
      { buffer: Buffer.from('test image'), mimetype: 'image/png', originalname: 'photo.png' },
      'image',
      { accessToken: 'merchant-token', phoneNumberId: 'phone-222' },
      'Hello 😊'
    );

    expect(sent).toEqual({ success: true, messageId: 'wamid-123', mediaId: 'media-123' });
    expect(axios.post.mock.calls[0][0]).toContain('/phone-222/media');
    expect(axios.post.mock.calls[1][0]).toContain('/phone-222/messages');
    expect(axios.post.mock.calls[1][1]).toMatchObject({ to: '919876543210', type: 'image', image: { id: 'media-123', caption: 'Hello 😊' } });
    expect(axios.post.mock.calls[1][2].headers.Authorization).toBe('Bearer merchant-token');
  });

  test('does not use platform credentials when merchant credentials are missing', async () => {
    const sent = await whatsappCloudAPI.sendMedia('919876543210', { buffer: Buffer.from('x') }, 'image', null);
    expect(sent.success).toBe(false);
    expect(axios.post).not.toHaveBeenCalled();
  });
});
