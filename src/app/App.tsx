import { AppRouter } from "@/app/router";
import { AppProviders } from "@/app/providers/AppProviders";
import { AuthProvider } from "@/features/auth/auth-context";

export default function App() {
  return (
    <AppProviders>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </AppProviders>
  );
}

