class WebSocketService {
    url: string;
    connection: WebSocket | null;

    constructor(url: string) {
        this.url = url;
        this.connection = null;
    }

    connect(): void {
        this.connection = new WebSocket(this.url);

        this.connection.onopen = () => {
            console.log('WebSocket connected');
            this.sendMessage({ type: 'visiter' });
        };

        this.connection.onmessage = (event: MessageEvent) => {
            const message = event.data;
        };

        this.connection.onclose = () => {
            console.log('WebSocket disconnected');
        };

        this.connection.onerror = (error: Event) => {
            console.log('WebSocket error:', error);
        };
    }

    sendMessage(message: object): void {
        if (this.connection && this.connection.readyState === WebSocket.OPEN) {
            this.connection.send(JSON.stringify(message));
        }
    }

    disconnect(): void {
        if (this.connection) {
            this.connection.close();
        }
    }

    getConnection(): WebSocket | null {
        return this.connection;
    }
}

export default WebSocketService;
