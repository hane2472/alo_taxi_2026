import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Car, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — ألو تكسي" },
      { name: "description", content: "تسجيل الدخول إلى نظام إدارة طلبات وعمولات مكتب ألو تكسي." },
      { property: "og:title", content: "تسجيل الدخول — ألو تكسي" },
      { property: "og:description", content: "نظام إدارة طلبات وعمولات مكتب ألو تكسي." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      toast.error("تعذّر تسجيل الدخول. تحقق من البريد وكلمة المرور.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      toast.error("هذا الحساب معطّل. راجع مدير النظام.");
      setLoading(false);
      return;
    }

    await supabase.rpc("touch_last_login");
    toast.success("تم تسجيل الدخول بنجاح");
    navigate({ to: "/", replace: true });
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) {
      toast.error("تعذّر إرسال رابط الاستعادة");
      return;
    }
    toast.success("إذا كان البريد مسجّلاً فسيصلك رابط لإعادة تعيين كلمة المرور.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
            <Car className="size-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold">ألو تكسي</h1>
            <p className="text-sm text-muted-foreground">نظام إدارة الطلبات والعمولات</p>
          </div>
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">الدخول إلى النظام</CardTitle>
            <CardDescription className="text-xs">
              استخدم الحساب الذي زوّدك به المدير.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="reset">نسيت كلمة المرور</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form className="space-y-3 pt-3" onSubmit={signIn}>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">كلمة المرور</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="ml-2 size-4 animate-spin" />}
                    دخول
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="reset">
                <form className="space-y-3 pt-3" onSubmit={resetPassword}>
                  <div className="space-y-1.5">
                    <Label htmlFor="email2">البريد الإلكتروني</Label>
                    <Input
                      id="email2"
                      type="email"
                      required
                      dir="ltr"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="ml-2 size-4 animate-spin" />}
                    إرسال رابط الاستعادة
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground">
                    إنشاء الحسابات يتم من قبل المدير فقط.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
