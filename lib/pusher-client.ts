import PusherClient from 'pusher-js';

let pusherClientInstance: PusherClient | null = null;

export const getPusherClient = (): PusherClient => {
    if (!pusherClientInstance) {
        pusherClientInstance = new PusherClient(
            process.env.NEXT_PUBLIC_PUSHER_KEY!,
            {
                cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
                authEndpoint: '/api/pusher/auth',
                auth: {
                    headers: {
                        'Authorization': typeof window !== 'undefined' ? `Bearer ${localStorage.getItem('token')}` : '',
                    }
                }
            }
        );
    }
    return pusherClientInstance;
};
