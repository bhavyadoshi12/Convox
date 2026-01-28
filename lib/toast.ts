type ToastType = 'success' | 'error' | 'info';

type ToastEvent = {
    type: ToastType;
    message: string;
};

type Listener = (event: ToastEvent) => void;

class ToastEmitter {
    private listeners: Listener[] = [];

    subscribe(listener: Listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    emit(type: ToastType, message: string) {
        this.listeners.forEach(listener => listener({ type, message }));
    }

    success(message: string) {
        this.emit('success', message);
    }

    error(message: string) {
        this.emit('error', message);
    }

    info(message: string) {
        this.emit('info', message);
    }
}

export const toast = new ToastEmitter();
