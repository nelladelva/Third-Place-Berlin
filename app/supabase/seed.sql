-- Launch circles (Stage 1). Admins can change visibility, hosts and descriptions later.
insert into public.circles (name, emoji, color, visibility, description) values
  ('Karaoke',                       '🎤', '#8E3B8A', 'open',   'Sing badly, together'),
  ('Book Lovers',                   '📚', '#A0522D', 'open',   'Reading circles & author talks'),
  ('Co-working & Networking',       '💻', '#C1592A', 'open',   'Work side by side, meet professionals'),
  ('Women Events',                  '✊', '#B9647D', 'closed', 'Gatherings for women'),
  ('Art Lovers',                    '🎨', '#2E6E8E', 'open',   'Galleries, museums, studios'),
  ('Berlin Events',                 '🐻', '#D9A441', 'open',   'Festivals, concerts, city life'),
  ('Sports Events',                 '⚽', '#2F5D58', 'open',   'Run, play, watch'),
  ('BBB · Belong Beyond Borders',   '🌍', '#3C4A7A', 'open',   'Culture, co-working and shared hobbies')
on conflict (name) do nothing;
