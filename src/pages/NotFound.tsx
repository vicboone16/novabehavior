import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Users, Calendar, BarChart3, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { GlobalSearch } from "@/components/GlobalSearch";

const QUICK_LINKS = [
  { label: "Dashboard", path: "/", icon: Home },
  { label: "Students", path: "/students", icon: Users },
  { label: "Schedule", path: "/schedule", icon: Calendar },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Lightweight header so users can orient themselves */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3 px-3 md:px-4 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/")}
            className="font-bold text-lg text-foreground hover:text-primary transition-colors"
          >
            NovaBehavior
          </button>
          <div className="flex-1 max-w-md">
            <GlobalSearch />
          </div>
        </div>
      </header>

      <main className="flex-1 container px-3 md:px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div>
            <h1 className="text-7xl font-bold text-primary">404</h1>
            <p className="text-2xl font-semibold mt-2">Page not found</p>
            <p className="text-muted-foreground mt-2">
              The page <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-sm">{location.pathname}</code> doesn't exist or may have moved.
            </p>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={() => navigate("/")}>
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>

          <div className="pt-6">
            <p className="text-sm text-muted-foreground mb-3 flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              Or jump to a common section:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QUICK_LINKS.map(({ label, path, icon: Icon }) => (
                <Card
                  key={path}
                  className="cursor-pointer hover:border-primary hover:bg-accent transition-colors"
                  onClick={() => navigate(path)}
                >
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
