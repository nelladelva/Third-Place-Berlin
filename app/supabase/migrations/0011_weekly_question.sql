-- Question of the week (BBB): every Monday at 9:00 Berlin time, a "Third Place" card in the BBB chat + a push to BBB members.
-- The 60 questions were approved by Nella on 3 Nov 2026. They're posted in shuffled order, never repeated;
-- after the whole list, it starts over in a new order.

-- 1. A chat message can be a question card, which has no author ("Third Place").
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('text', 'poll', 'question'));
alter table public.messages alter column author_id drop not null;
alter table public.messages add constraint messages_author_required check (author_id is not null or kind = 'question');

-- 2. A new notification kind for the push.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'meetup_new', 'poll_new', 'mention', 'reply', 'message_new', 'member_approved', 'join_request', 'join_decided',
  'proposal_new', 'proposal_decided', 'recommended', 'weekly_question'));

-- 3. The question list (server-only: members never see what's coming).
create table public.weekly_questions (
  id              uuid primary key default gen_random_uuid(),
  body            text not null unique check (char_length(body) between 1 and 300),
  position        double precision not null default random(),
  last_posted_at  timestamptz
);
alter table public.weekly_questions enable row level security;
revoke all on public.weekly_questions from public, anon, authenticated;

insert into public.weekly_questions(body) values
  ($q$What was the moment you knew you were really leaving home?$q$),
  ($q$What did you pack that you didn't need, and what do you wish you had brought?$q$),
  ($q$Who was the first person you told you were moving to Berlin, and what did they say?$q$),
  ($q$What did you imagine Berlin would be like before you arrived? How close was it?$q$),
  ($q$Describe your first night in Berlin in three words.$q$),
  ($q$What's one thing you said goodbye to that you still miss?$q$),
  ($q$If you could send a message to yourself on the day you arrived, what would it say?$q$),
  ($q$Why Berlin, and not somewhere else?$q$),
  ($q$What surprised you most in your first week here?$q$),
  ($q$What's a small thing from home you carry with you every day?$q$),
  ($q$What's the bravest thing you've done since arriving, even if it looked small from outside?$q$),
  ($q$What's something you do here that you would never have done back home?$q$),
  ($q$Tell us about a time you got completely lost in Berlin. Where did you end up?$q$),
  ($q$What's the best spontaneous "yes" you've said since moving?$q$),
  ($q$Which corner of Berlin feels like your secret discovery?$q$),
  ($q$What's one thing on your Berlin bucket list you haven't done yet?$q$),
  ($q$What's a skill you learned out of pure necessity since moving?$q$),
  ($q$Have you ever been to a place in Berlin that felt like another country? Where?$q$),
  ($q$What's the most Berlin thing that has happened to you?$q$),
  ($q$If a friend visited for one perfect day, where would you take them?$q$),
  ($q$Be honest: was there a day you wanted to go back? What kept you here?$q$),
  ($q$What's harder about living here than you expected?$q$),
  ($q$What did moving cost you that people don't see?$q$),
  ($q$What's one thing about home you understand better now that you're away?$q$),
  ($q$Has Berlin changed what you think "success" means?$q$),
  ($q$What would make you leave Berlin one day?$q$),
  ($q$When did Berlin first start to feel like home, or hasn't it yet?$q$),
  ($q$What's a belief you had before moving that you've let go of?$q$),
  ($q$Is there a version of you that stayed home? What is that person doing today?$q$),
  ($q$What advice would you give someone who's scared to make the move?$q$),
  ($q$Where in Berlin do you feel most like yourself?$q$),
  ($q$Who was the first person here who made you feel welcome?$q$),
  ($q$What does "home" mean to you now?$q$),
  ($q$What's a tradition from home you've kept alive here?$q$),
  ($q$What's something from your culture you wish more people in Berlin knew about?$q$),
  ($q$What's a German habit you've picked up without noticing?$q$),
  ($q$Which language do you think in now? Has it changed?$q$),
  ($q$What's a dish from home you'd cook for this group?$q$),
  ($q$What do you miss about the people back home that you can't find here?$q$),
  ($q$What's one thing you love about Berlin that you'd defend in any argument?$q$),
  ($q$What has living here taught you about yourself?$q$),
  ($q$What's a small win from this week you're proud of?$q$),
  ($q$What's one thing you're learning right now, outside of work?$q$),
  ($q$What's the best piece of advice someone gave you about Berlin life?$q$),
  ($q$Which German word describes your life right now?$q$),
  ($q$What's a fear you've grown out of since you arrived?$q$),
  ($q$Who in your life back home would be most surprised by who you are now?$q$),
  ($q$What's something you can teach others here, even if it's small?$q$),
  ($q$What do you want your life in Berlin to look like a year from now?$q$),
  ($q$What's a mistake you made here that turned out well?$q$),
  ($q$Your Berlin day in emojis: go!$q$),
  ($q$Best Döner, best Spätkauf, best park bench: name yours.$q$),
  ($q$What's the funniest misunderstanding you've had in German?$q$),
  ($q$U-Bahn, S-Bahn, bike, or feet: what's your Berlin vehicle and why?$q$),
  ($q$What song is the soundtrack of your Berlin life right now?$q$),
  ($q$Which Berlin neighbourhood are you, and why?$q$),
  ($q$What's the strangest thing you've seen on the U8?$q$),
  ($q$Sunday in Berlin: what does your perfect one look like?$q$),
  ($q$If Berlin were a person, how would you describe their personality?$q$),
  ($q$What's a question you'd love to ask everyone in this group? (We might use it!)$q$)
on conflict (body) do nothing;

-- 4. Post this week's question. Does nothing unless it's Monday 9:00 in Berlin and nothing was posted today.
--    p_now exists for tests; the scheduler calls it without arguments.
create or replace function public.post_weekly_question(p_now timestamptz default now()) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_local timestamp := p_now at time zone 'Europe/Berlin'; v_bbb uuid; v_q weekly_questions; v_msg uuid;
begin
  if extract(isodow from v_local) <> 1 or extract(hour from v_local) <> 9 then return null; end if;
  select id into v_bbb from circles where name like 'BBB%' and status = 'active' order by created_at limit 1;
  if v_bbb is null then return null; end if;
  if exists (select 1 from messages where circle_id = v_bbb and kind = 'question'
              and (created_at at time zone 'Europe/Berlin')::date = v_local::date) then return null; end if;

  if not exists (select 1 from weekly_questions where last_posted_at is null) then
    update weekly_questions set last_posted_at = null, position = random();   -- whole list used: start over, new order
  end if;
  select * into v_q from weekly_questions where last_posted_at is null order by position limit 1 for update;
  if v_q.id is null then return null; end if;

  insert into messages(circle_id, author_id, body, kind, created_at) values (v_bbb, null, v_q.body, 'question', p_now)
    returning id into v_msg;
  update weekly_questions set last_posted_at = p_now where id = v_q.id;

  perform notify(m.user_id, 'weekly_question', null, jsonb_build_object(
      'circle', circle_name(v_bbb), 'circle_id', v_bbb, 'message_id', v_msg, 'body', v_q.body))
    from circle_members m where m.circle_id = v_bbb and pref(m.user_id, v_bbb, 'meetups_polls');
  return v_msg;
end $$;
revoke execute on function public.post_weekly_question(timestamptz) from public, anon, authenticated;

-- 5. The scheduler: Mondays at 07:00 and 08:00 UTC. One of them is 9:00 in Berlin (summer / winter time);
--    the function ignores the other. Skipped where pg_cron isn't available (local tests).
do $do$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'weekly-question';
    perform cron.schedule('weekly-question', '0 7,8 * * 1', 'select public.post_weekly_question()');
  end if;
end $do$;
