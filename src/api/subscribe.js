import client from './client';

export const startSubscription = async (type, token) => {
  const response = await client.post(
    '/subscribe/start',
    { type },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const cancelSubscription = async (token) => {
  const response = await client.post(
    '/subscribe/cancel',
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const getSubscriptionStatus = async (token) => {
  const response = await client.get('/subscribe/status', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};
