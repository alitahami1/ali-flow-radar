# ALI Flow Radar v5.14.0

این نسخه با Gateway جدید اجرا می‌شود و بخش مشاور تحقیقاتی آن روی **GPT-6 Astra** قرار گرفته است.

## اجرا
1. `npm install`
2. متغیر محیطی `OPENAI_API_KEY` را در سرویس میزبان تنظیم کنید.
3. `npm start`
4. مرورگر: `http://localhost:3000`

مدل پیش‌فرض: `gpt-6-astra`

برای تغییر مدل یا effort می‌توانید این متغیرها را تنظیم کنید:
- `OPENAI_MODEL`
- `OPENAI_REASONING_EFFORT`

## Endpointها
- `/api/health` وضعیت نسخه، مدل Astra و تنظیم بودن API key را نشان می‌دهد.
- `/api/astra-advisor` یک تحلیل تحقیقاتی با GPT-6 Astra از داده‌های فعلی برنامه می‌سازد.

منطق اصلی برنامه در `server.js` دست‌نخورده مانده و Gateway فقط لایه Astra را به آن اضافه می‌کند.

برای موبایل، پروژه را روی Render / Railway / یک VPS با HTTPS منتشر کنید.
