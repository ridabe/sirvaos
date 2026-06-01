import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { supabase } from "../lib/supabase";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

async function logErrorToSupabase(error: Error, info: ErrorInfo) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await supabase.from("app_error_logs").insert({
      user_id: session?.user?.id ?? null,
      tenant_id: null,
      error_type: "react_error_boundary",
      error_message: error.message,
      error_stack: error.stack ?? null,
      context: { componentStack: info.componentStack },
      url: window.location.href,
    });
  } catch {
    // silencia falha de log para não mascarar o erro original
  }
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void logErrorToSupabase(error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-background, #f9fafb)",
          padding: "2rem",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: "#fff",
            borderRadius: 16,
            padding: "2.5rem",
            boxShadow: "0 4px 24px rgba(0,0,0,.08)",
            textAlign: "center",
          }}
        >
          <AlertTriangle size={48} color="var(--color-danger, #ef4444)" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8, color: "#111" }}>
            Ocorreu um erro inesperado
          </h2>
          <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: 24 }}>
            Algo deu errado ao carregar esta página. O erro foi registrado automaticamente.
            {this.state.message && (
              <>
                <br />
                <code
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    padding: "4px 8px",
                    background: "#f3f4f6",
                    borderRadius: 6,
                    fontSize: "0.8rem",
                    color: "#374151",
                    wordBreak: "break-all",
                  }}
                >
                  {this.state.message}
                </code>
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 24px",
              background: "var(--color-primary, #6366f1)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={16} />
            Recarregar página
          </button>
        </div>
      </div>
    );
  }
}
