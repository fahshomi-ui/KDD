import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Smartphone, Share2, Plus, CheckCircle2, Chrome, Apple, ShieldCheck, Bell, Zap, WifiOff, QrCode, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const AdminInstall = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | "unknown">("unknown");
  const [copied, setCopied] = useState(false);

  const installUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/admin/install`
      : "https://makany-kitchen-vault.lovable.app/admin/install";
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(installUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  useEffect(() => {
    document.title = "تثبيت لوحة التحكم | كي دي دي";

    // Inject admin manifest dynamically (replace any existing manifest link)
    const existing = document.querySelector('link[rel="manifest"]');
    const original = existing?.getAttribute("href") || "/manifest.json";
    if (existing) existing.setAttribute("href", "/admin-manifest.json");

    // Detect platform
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) setPlatform("ios");
    else if (/Android/i.test(ua)) setPlatform("android");
    else setPlatform("desktop");

    // Check if already installed
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore
      window.navigator.standalone === true;
    if (standalone) setInstalled(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
      if (existing) existing.setAttribute("href", original);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setDeferred(null);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-red-500 to-red-700 shadow-2xl shadow-red-500/30 mb-5 ring-4 ring-white/10">
            <img src="/pwa-icon-192.png" alt="لوحة تحكم كي دي دي" className="w-16 h-16 rounded-2xl" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            ثبّت لوحة التحكم على جوالك
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            تطبيق مخصص لإدارة طلبات ومنتجات وعروض كي دي دي — وصول سريع، إشعارات فورية، ويعمل بدون إنترنت.
          </p>
        </div>

        {/* Status / CTA */}
        {installed ? (
          <Card className="bg-emerald-500/10 border-emerald-500/30 p-6 mb-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-emerald-300">التطبيق مُثبّت بالفعل ✅</h2>
            <p className="text-sm text-emerald-200/80 mt-1">افتحه من الشاشة الرئيسية لجوالك.</p>
          </Card>
        ) : platform === "android" || platform === "desktop" ? (
          <Card className="bg-white/5 border-white/10 p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 text-center sm:text-right">
                <h2 className="font-bold text-lg mb-1">جاهز للتثبيت بضغطة واحدة</h2>
                <p className="text-sm text-slate-400">اضغط الزر وسيُضاف التطبيق للشاشة الرئيسية.</p>
              </div>
              <Button
                size="lg"
                onClick={handleInstall}
                disabled={!deferred}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 gap-2 shadow-lg shadow-red-500/30 w-full sm:w-auto"
              >
                <Download className="w-5 h-5" />
                {deferred ? "ثبّت الآن" : "افتح في Chrome للتثبيت"}
              </Button>
            </div>
            {!deferred && (
              <p className="text-xs text-amber-300/80 mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                💡 إذا لم يظهر الزر مفعّلاً: افتح هذه الصفحة في متصفح <strong>Chrome</strong> أو <strong>Edge</strong>، أو استخدم قائمة المتصفح ← <strong>"تثبيت التطبيق" / "إضافة إلى الشاشة الرئيسية"</strong>.
              </p>
            )}
          </Card>
        ) : null}

        {/* iOS Instructions */}
        {platform === "ios" && !installed && (
          <Card className="bg-white/5 border-white/10 p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Apple className="w-6 h-6" />
              <h2 className="font-bold text-lg">طريقة التثبيت على iPhone / iPad</h2>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center font-bold flex-shrink-0">1</span>
                <div className="pt-0.5">
                  افتح هذه الصفحة في متصفح <strong>Safari</strong> (مهم).
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center font-bold flex-shrink-0">2</span>
                <div className="pt-0.5 flex items-center gap-1 flex-wrap">
                  اضغط على أيقونة <strong>المشاركة</strong>
                  <Share2 className="inline w-4 h-4 text-blue-400" />
                  في شريط الأدوات السفلي.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center font-bold flex-shrink-0">3</span>
                <div className="pt-0.5 flex items-center gap-1 flex-wrap">
                  اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong>
                  <Plus className="inline w-4 h-4" />
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center font-bold flex-shrink-0">4</span>
                <div className="pt-0.5">اضغط <strong>"إضافة"</strong> في الأعلى — وسيظهر التطبيق على شاشتك الرئيسية.</div>
              </li>
            </ol>
          </Card>
        )}

        {/* Android extra instructions */}
        {platform === "android" && (
          <Card className="bg-white/5 border-white/10 p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Chrome className="w-6 h-6 text-blue-400" />
              <h2 className="font-bold text-lg">طريقة بديلة على Android</h2>
            </div>
            <ol className="space-y-3 text-sm text-slate-300">
              <li>1. افتح قائمة Chrome (⋮) في الزاوية العلوية.</li>
              <li>2. اختر <strong className="text-white">"تثبيت التطبيق"</strong> أو <strong className="text-white">"إضافة إلى الشاشة الرئيسية"</strong>.</li>
              <li>3. أكّد التثبيت — وسيظهر التطبيق فوراً على الشاشة الرئيسية.</li>
            </ol>
          </Card>
        )}

        {/* QR Code Card — handy on desktop to install via phone */}
        {!installed && (
          <Card className="bg-white/5 border-white/10 p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-6 h-6 text-red-400" />
              <h2 className="font-bold text-lg">ثبّته على جوالك عبر رمز QR</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="bg-white p-3 rounded-2xl shadow-xl shadow-red-500/10 ring-1 ring-white/20 flex-shrink-0">
                <img
                  src={qrSrc}
                  alt="رمز QR لتثبيت لوحة التحكم"
                  width={200}
                  height={200}
                  className="w-44 h-44 sm:w-52 sm:h-52 block"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 text-center sm:text-right space-y-3">
                <p className="text-sm text-slate-300 leading-relaxed">
                  افتح كاميرا جوالك ووجّهها للرمز، ثم اضغط على الرابط الذي يظهر لفتح صفحة التثبيت مباشرة.
                </p>
                <div className="bg-slate-900/60 border border-white/10 rounded-lg p-2 flex items-center gap-2">
                  <code className="text-xs text-slate-300 truncate flex-1 text-left ltr" dir="ltr">
                    {installUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    className="h-8 px-2 text-slate-300 hover:text-white hover:bg-white/10 flex-shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs mr-1">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-xs mr-1">نسخ</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  مناسب للموظفين الجدد — امسح الرمز وثبّت التطبيق خلال ثوانٍ.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Features */}
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {[
            { icon: Zap, title: "وصول فوري", desc: "افتح اللوحة بضغطة واحدة من الشاشة الرئيسية" },
            { icon: Bell, title: "إشعارات فورية", desc: "تنبيهات عند وصول الطلبات الجديدة" },
            { icon: WifiOff, title: "يعمل بدون إنترنت", desc: "تصفح آخر البيانات حتى عند انقطاع الشبكة" },
            { icon: ShieldCheck, title: "آمن ومخصص", desc: "تطبيق منفصل عن متجر العملاء بصلاحيات الإدارة" },
          ].map((f, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">{f.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link to="/admin" className="text-sm text-slate-400 hover:text-white underline underline-offset-4">
            ← العودة إلى لوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminInstall;