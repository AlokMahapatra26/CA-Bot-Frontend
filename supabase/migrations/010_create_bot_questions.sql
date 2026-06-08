-- Migration 010: Create bot_questions table and seed default onboarding questions
CREATE TABLE IF NOT EXISTS public.bot_questions (
    id TEXT PRIMARY KEY,
    sequence_order INT NOT NULL UNIQUE,
    question_text TEXT NOT NULL,
    expected_type TEXT NOT NULL CHECK (expected_type IN ('text', 'phone', 'date', 'email', 'file')),
    validation_regex TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.bot_questions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access
CREATE POLICY "Allow authenticated users full access to bot_questions"
ON public.bot_questions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow public read access (for anon connections such as bot backend)
CREATE POLICY "Allow public read access to bot_questions"
ON public.bot_questions
FOR SELECT
TO anon, authenticated
USING (true);

-- Seed initial onboarding questions
INSERT INTO public.bot_questions (id, sequence_order, question_text, expected_type, validation_regex, error_message)
VALUES
  (
    'name',
    1,
    'To get started, I''ll set up your account (takes ~2 minutes).\n\nPlease reply with your *Full Name* as printed on your *PAN Card* 👇',
    'text',
    NULL,
    NULL
  ),
  (
    'phone',
    2,
    '*(Step 1/5)*\nPlease reply with your *10-digit whatsapp number currently you are using in this phone* (e.g., 9876543210).\n\n💡 You can type *back* at any step to go to the previous question.',
    'phone',
    '^\d{10,15}$',
    '⚠️ Please enter a valid mobile number — digits only, e.g., 9876543210.'
  ),
  (
    'dob',
    3,
    '*(Step 2/5)*\nWhat is your *Date of Birth*? Reply in *DD-MM-YYYY* format (e.g., 15-08-1995).\n\n💡 You can type *back* at any step to go to the previous question.',
    'date',
    '^\d{2}-\d{2}-\d{4}$',
    '⚠️ Invalid format. Please reply in *DD-MM-YYYY* format (e.g., 15-08-1995).'
  ),
  (
    'email',
    4,
    '*(Step 3/5)*\nWhat is your *Email Address*? (e.g., name@gmail.com)\n\n💡 You can type *back* at any step to go to the previous question.',
    'email',
    '^[^\s@]+@[^\s@]+\.[^\s@]+$',
    '⚠️ Invalid email. Please enter a valid address (e.g., name@gmail.com).'
  ),
  (
    'pan',
    5,
    '*(Step 4/5)*\nNow I need your *PAN Card* for KYC verification.\n\nPlease upload a clear photo or PDF of your *PAN Card* 📎\n\n💡 You can type *back* at any step to go to the previous question.',
    'file',
    NULL,
    '⚠️ Please upload your *PAN Card* as an image or PDF.'
  ),
  (
    'aadhaar',
    6,
    '*(Step 5/5)*\nAlmost done! Please now upload your *Aadhaar Card* 📎\n\n💡 You can type *back* at any step to go to the previous question.',
    'file',
    NULL,
    '⚠️ Please upload your *Aadhaar Card* as an image or PDF to complete your registration.'
  )
ON CONFLICT (id) DO UPDATE SET
  sequence_order = EXCLUDED.sequence_order,
  question_text = EXCLUDED.question_text,
  expected_type = EXCLUDED.expected_type,
  validation_regex = EXCLUDED.validation_regex,
  error_message = EXCLUDED.error_message;
