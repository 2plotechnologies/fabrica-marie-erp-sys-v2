import React, { Component, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {

    constructor(props: Props) {
        super(props);

        this.state = {
            hasError: false
        };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Error capturado:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "10px", background: "#ffe5e5", color: "#900" }}>
                    ⚠️ Ocurrió un error en este módulo.
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;