
DELETE FROM public.stock WHERE article_id = '6c1e7c1b-df0b-4d7c-833b-d04688f82182';
DELETE FROM public.stock WHERE article_id = '54502e27-9835-4092-a91b-41810e97cbaa';

INSERT INTO public.stock (article_id, quantity) VALUES
  ('6c1e7c1b-df0b-4d7c-833b-d04688f82182', 5),
  ('6c1e7c1b-df0b-4d7c-833b-d04688f82182', 15),
  ('6c1e7c1b-df0b-4d7c-833b-d04688f82182', 30);

INSERT INTO public.stock (article_id, quantity) VALUES
  ('54502e27-9835-4092-a91b-41810e97cbaa', 3),
  ('54502e27-9835-4092-a91b-41810e97cbaa', 30),
  ('54502e27-9835-4092-a91b-41810e97cbaa', 300);
