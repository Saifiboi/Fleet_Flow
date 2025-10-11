export default function Forbidden() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
      <h1 className="text-3xl font-semibold text-destructive">Access denied</h1>
      <p className="max-w-md text-muted-foreground">
        You do not have permission to view this page. If you believe this is a mistake, please contact your administrator.
      </p>
    </div>
  );
}
