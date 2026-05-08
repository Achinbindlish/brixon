SELECT cron.unschedule('daily-low-stock-scan');
SELECT cron.schedule(
  'daily-low-stock-scan',
  '0 4 * * *',
  $$
  select net.http_post(
    url:='https://ebwvulhtphiicfhpwjld.supabase.co/functions/v1/google-sheets-inventory',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVid3Z1bGh0cGhpaWNmaHB3amxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDM3OTksImV4cCI6MjA4OTkxOTc5OX0.Ok1J-sc5kt5cF_ANTF2YiP4hfUNoJBK7V0P8ygpWa_Y"}'::jsonb,
    body:='{"action":"scan-low-stock","cron_secret":"https://script.google.com/macros/s/AKfycby-yFhm2SY4b6YweZOBdz2L58recgiaaCVbDrcqeKcIuowjIHQE1Z7T9cn1hKwMkrXG/exec"}'::jsonb
  ) as request_id;
  $$
);