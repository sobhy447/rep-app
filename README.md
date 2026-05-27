# نظام ERP Universal

## الملفات في هذا المشروع

```
erp-app/
├── public/
│   └── index.html
├── src/
│   ├── App.js                 ← التطبيق الرئيسي + Auth
│   ├── index.js               ← نقطة الدخول
│   ├── lib/
│   │   └── supabase.js        ← اتصال قاعدة البيانات
│   ├── components/
│   │   └── MainLayout.js      ← القائمة الجانبية والتخطيط
│   └── pages/
│       ├── LoginPage.js       ← صفحة الدخول
│       ├── Dashboard.js       ← لوحة التحكم
│       ├── AccountsPage.js    ← دليل الحسابات
│       ├── CustomersPage.js   ← العملاء
│       ├── EmployeesPage.js   ← الموظفين
│       └── SettingsPage.js    ← الإعدادات
├── package.json
├── vercel.json
└── README.md
```

## خطوات النشر على Vercel

### 1. ارفع الكود على GitHub
- افتح github.com → New Repository → اسمه: `erp-app`
- ارفع كل الملفات

### 2. اربط Vercel بـ GitHub
- افتح vercel.com → New Project → اختر الـ Repository
- اضغط Deploy

### 3. النتيجة
- رابط مثل: `https://erp-app.vercel.app`
- يعمل من أي جهاز أو موبايل

## المتغيرات
- Supabase URL: `https://ouielvsbmdjnsllvlnys.supabase.co`
- موجودة مباشرة في `src/lib/supabase.js`

## الشاشات الجاهزة
- ✅ Login (تسجيل دخول)
- ✅ Dashboard (لوحة التحكم)
- ✅ دليل الحسابات (شجرة تفاعلية كاملة)
- ✅ العملاء والموكلين
- ✅ الموظفين
- ✅ الإعدادات

## الشاشات القادمة
- القيود اليومية
- سندات القبض والصرف
- ميزان المراجعة
- كشف الحساب
- كشوف الرواتب
