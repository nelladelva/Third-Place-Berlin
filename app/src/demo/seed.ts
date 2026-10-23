// Sample content for the demo: the 8 real launch circles (exactly as supabase/seed.sql) and a fictional community.
// No real people: invented names, no emails, no photos (avatarUrl null → initials). English only.
import type { DemoProfile, DemoState } from './types';

const ME = 'demo-you';

/** An ISO time `days` after the start date at hh:mm Berlin time (approximated as UTC+1). */
function at(startedAt: string, days: number, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(`${startedAt}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(h - 1, m, 0, 0);
  return d.toISOString();
}

type P = { id: string; name: string; field: string; origin: string; languages: string[]; since: string; bio: string;
  fun: string; teach: string[]; learn: string[]; status?: 'pending' | 'member'; role?: 'member' | 'admin'; invitedBy?: string };

const PEOPLE: P[] = [
  { id: 'p-amara', name: 'Amara Okafor', field: 'Product designer', origin: 'Nigeria', languages: ['English', 'Igbo'], since: '2023',
    bio: 'Designing apps by day, hunting the best jollof in Berlin by night.', fun: 'Has climbed Kilimanjaro twice.',
    teach: ['Figma', 'Portfolio reviews'], learn: ['German', 'Pottery'] },
  { id: 'p-diego', name: 'Diego Fernández', field: 'Data engineer', origin: 'Argentina', languages: ['Spanish', 'English'], since: '2022',
    bio: 'Pipelines, empanadas and Sunday football.', fun: 'Can name every Boca Juniors goal of 2000.',
    teach: ['SQL', 'Tango basics'], learn: ['German', 'Photography'] },
  { id: 'p-mei', name: 'Mei Lin', field: 'UX researcher', origin: 'Taiwan', languages: ['Mandarin', 'English', 'German'], since: '2021',
    bio: 'I ask people questions for a living, and for fun.', fun: 'Owns 40 houseplants.',
    teach: ['Interview skills', 'Mandarin'], learn: ['Karaoke confidence'] },
  { id: 'p-lukas', name: 'Lukas Becker', field: 'Teacher', origin: 'Germany', languages: ['German', 'English'], since: 'Born here',
    bio: 'Berliner, happy to explain the Kiez and the paperwork.', fun: 'Knows every Späti in Neukölln.',
    teach: ['German', 'Bürgeramt survival'], learn: ['Spanish'] },
  { id: 'p-priya', name: 'Priya Raman', field: 'Biotech scientist', origin: 'India', languages: ['English', 'Tamil', 'Hindi'], since: '2024',
    bio: 'Lab coat on weekdays, hiking boots on weekends.', fun: 'Makes the best chai in Wedding.',
    teach: ['Lab careers', 'South Indian cooking'], learn: ['German', 'Bouldering'] },
  { id: 'p-sofia', name: 'Sofia Rossi', field: 'Architect', origin: 'Italy', languages: ['Italian', 'English', 'German'], since: '2020',
    bio: 'Drawing buildings, drinking espresso, judging pasta.', fun: 'Sketches every café she visits.',
    teach: ['Sketching', 'Italian'], learn: ['Running'] },
  { id: 'p-kwame', name: 'Kwame Mensah', field: 'Software developer', origin: 'Ghana', languages: ['English', 'Twi'], since: '2023',
    bio: 'Building things on the web and in the kitchen.', fun: 'DJs at friends\' birthdays.',
    teach: ['JavaScript', 'Ghanaian music'], learn: ['German', 'Chess'] },
  { id: 'p-elena', name: 'Elena Petrova', field: 'Translator', origin: 'Bulgaria', languages: ['Bulgarian', 'English', 'German', 'Russian'],
    since: '2019', bio: 'Words are my job and my hobby.', fun: 'Reads three books at once.',
    teach: ['Translation', 'Book picks'], learn: ['Salsa'] },
  { id: 'p-jonas', name: 'Jonas Schmidt', field: 'Photographer', origin: 'Germany', languages: ['German', 'English'], since: '2018',
    bio: 'Street photography and long walks along the Spree.', fun: 'Shoots only on film on Sundays.',
    teach: ['Photography', 'German'], learn: ['Portuguese'] },
  { id: 'p-aylin', name: 'Aylin Demir', field: 'Marketing manager', origin: 'Türkiye', languages: ['Turkish', 'English', 'German'],
    since: '2022', bio: 'Storyteller, brunch organiser, plant killer.', fun: 'Has a playlist for every mood.',
    teach: ['Marketing', 'Turkish breakfast'], learn: ['Yoga'] },
  { id: 'p-mateo', name: 'Mateo Silva', field: 'Chef', origin: 'Brazil', languages: ['Portuguese', 'English'], since: '2024',
    bio: 'Cooking for a living and for anyone who shows up.', fun: 'Plays samba percussion.',
    teach: ['Cooking', 'Portuguese'], learn: ['German'] },
  { id: 'p-hana', name: 'Hana Kim', field: 'Illustrator', origin: 'South Korea', languages: ['Korean', 'English'], since: '2023',
    bio: 'I draw cats, cities and the people in between.', fun: 'Collects museum tickets.',
    teach: ['Illustration', 'Korean'], learn: ['Karaoke in German'] },
  { id: 'p-omar', name: 'Omar Haddad', field: 'Consultant', origin: 'Lebanon', languages: ['Arabic', 'French', 'English'], since: '2021',
    bio: 'Strategy slides by day, oud by night.', fun: 'Runs a tiny supper club.',
    teach: ['Pitching', 'Arabic'], learn: ['Bouldering'] },
  { id: 'p-chloe', name: 'Chloé Martin', field: 'PhD student', origin: 'France', languages: ['French', 'English', 'German'], since: '2022',
    bio: 'Researching cities and how people find their place in them.', fun: 'Bakes bread every Saturday.',
    teach: ['Academic writing', 'French'], learn: ['Board games'] },
  { id: 'p-tomas', name: 'Tomás Novák', field: 'Musician', origin: 'Czechia', languages: ['Czech', 'English', 'German'], since: '2017',
    bio: 'Piano, bass and every karaoke classic.', fun: 'Once played a gig on a boat.',
    teach: ['Piano', 'Singing'], learn: ['Spanish'] },
  { id: 'p-ines', name: 'Inês Duarte', field: 'Nurse', origin: 'Portugal', languages: ['Portuguese', 'English'], since: '2025',
    bio: 'New in Berlin, looking for my people.', fun: 'Surfed in Nazaré.', teach: ['First aid'], learn: ['German'],
    status: 'pending', invitedBy: 'p-mateo' },
  { id: 'p-yusuf', name: 'Yusuf Aydın', field: 'Civil engineer', origin: 'Türkiye', languages: ['Turkish', 'English'], since: '2025',
    bio: 'Just moved for work, keen to explore.', fun: 'Solves Rubik\'s cubes blindfolded.', teach: ['Maths tutoring'], learn: ['German'],
    status: 'pending', invitedBy: 'p-aylin' },
];

function profile(p: P, startedAt: string): DemoProfile {
  const created = at(startedAt, -120, '12:00');
  return { id: p.id, displayName: p.name, field: p.field, origin: p.origin, languages: p.languages, berlinSince: p.since, bio: p.bio,
    funFact: p.fun, teach: p.teach, learn: p.learn, avatarUrl: null, locale: 'en', status: p.status ?? 'member', role: p.role ?? 'member',
    invitedBy: p.invitedBy ?? null, consentAt: created, welcomedAt: p.status === 'pending' ? null : created, createdAt: created,
    approvedAt: p.status === 'pending' ? null : created, sample: true };
}

export function seed(startedAt: string): DemoState {
  const t = (days: number, hhmm: string) => at(startedAt, days, hhmm);
  const me: DemoProfile = { id: ME, displayName: 'You (demo)', field: 'Demo profile', origin: null, languages: ['English'],
    berlinSince: null, bio: 'A pretend profile for trying the Third Place Berlin demo.', funFact: null, teach: [],
    learn: [], avatarUrl: null, locale: 'en', status: 'member', role: 'admin', invitedBy: null, consentAt: t(-30, '10:00'),
    welcomedAt: t(-30, '10:00'), createdAt: t(-30, '10:00'), approvedAt: t(-30, '10:00'), sample: true };

  const circles: DemoState['circles'] = [
    ['c-karaoke', 'Karaoke', '🎤', '#8E3B8A', 'open', 'Sing badly, together'],
    ['c-books', 'Book Lovers', '📚', '#A0522D', 'open', 'Reading circles & author talks'],
    ['c-cowork', 'Co-working & Networking', '💻', '#C1592A', 'open', 'Work side by side, meet professionals'],
    ['c-women', 'Women Events', '✊', '#B9647D', 'closed', 'Gatherings for women'],
    ['c-art', 'Art Lovers', '🎨', '#2E6E8E', 'open', 'Galleries, museums, studios'],
    ['c-berlin', 'Berlin Events', '🐻', '#D9A441', 'open', 'Festivals, concerts, city life'],
    ['c-sports', 'Sports Events', '⚽', '#2F5D58', 'open', 'Run, play, watch'],
    ['c-bbb', 'BBB · Belong Beyond Borders', '🌍', '#3C4A7A', 'open', 'Culture, co-working and shared hobbies'],
  ].map(([id, name, emoji, color, visibility, description]) => ({ id, name, emoji, color, visibility: visibility as 'open' | 'closed',
    description, status: 'active' as const, sample: true }));

  // Who is in which circle. I co-host Women Events (closed) so its join request can be approved; Art Lovers (open) is
  // there to try joining. Leaving Women Events and asking again shows the request side.
  const roster: Record<string, [string, 'member' | 'host'][]> = {
    'c-karaoke': [['p-tomas', 'host'], [ME, 'member'], ['p-mei', 'member'], ['p-kwame', 'member'], ['p-hana', 'member'], ['p-aylin', 'member']],
    'c-books': [['p-elena', 'host'], [ME, 'member'], ['p-chloe', 'member'], ['p-sofia', 'member'], ['p-lukas', 'member']],
    'c-cowork': [['p-omar', 'host'], [ME, 'member'], ['p-diego', 'member'], ['p-amara', 'member'], ['p-kwame', 'member'], ['p-priya', 'member']],
    'c-women': [['p-amara', 'host'], [ME, 'host'], ['p-priya', 'member'], ['p-sofia', 'member'], ['p-elena', 'member'], ['p-aylin', 'member']],
    'c-art': [['p-hana', 'host'], ['p-jonas', 'member'], ['p-sofia', 'member'], ['p-chloe', 'member']],
    'c-berlin': [[ME, 'host'], ['p-lukas', 'host'], ['p-mateo', 'member'], ['p-diego', 'member'], ['p-aylin', 'member'], ['p-jonas', 'member']],
    'c-sports': [['p-diego', 'host'], [ME, 'member'], ['p-priya', 'member'], ['p-mateo', 'member'], ['p-omar', 'member']],
    'c-bbb': [[ME, 'host'], ['p-amara', 'member'], ['p-diego', 'member'], ['p-mei', 'member'], ['p-lukas', 'member'], ['p-priya', 'member'],
      ['p-sofia', 'member'], ['p-kwame', 'member'], ['p-elena', 'member'], ['p-mateo', 'member'], ['p-hana', 'member'], ['p-omar', 'member'],
      ['p-chloe', 'member'], ['p-tomas', 'member'], ['p-aylin', 'member'], ['p-jonas', 'member']],
  };
  const circleMembers = Object.entries(roster).flatMap(([circleId, rows]) =>
    rows.map(([userId, role]) => ({ circleId, userId, role, sample: true })));

  const meetup = (id: string, circleId: string, hostId: string, title: string, day: number, from: string, to: string,
    locationName: string, lat: number, lng: number, extra: { description?: string; sign?: string; bring?: string; capacity?: number } = {}) => ({
    id, circleId, hostId, title, description: extra.description ?? null, startsAt: t(day, from), endsAt: t(day, to), locationName, lat, lng,
    sign: extra.sign ?? null, bring: extra.bring ?? null, capacity: extra.capacity ?? null, cancelledAt: null, createdAt: t(-3, '18:00'),
    sample: true });
  const meetups: DemoState['meetups'] = [
    meetup('m-tempelhof', 'c-berlin', ME, 'Tempelhof picnic', 2, '14:00', '18:00', 'Tempelhofer Feld, near the Columbiadamm entrance',
      52.4733, 13.4019, { description: 'Bring a snack to share. Kites welcome!', sign: 'yellow blanket by the big tree', bring: 'Snacks, a blanket, sunscreen' }),
    meetup('m-cowork', 'c-cowork', 'p-omar', 'Co-working morning', 1, '09:30', '13:00', 'St. Oberholz, Rosenthaler Platz', 52.5297, 13.4016,
      { description: 'Laptops out, coffee in. Lunch together at 12:30.', sign: 'big table upstairs, TPB card on it', bring: 'Laptop, charger' }),
    meetup('m-run', 'c-sports', 'p-diego', 'Morning run in Tiergarten', 3, '10:00', '11:30', 'Tiergarten, Siegessäule', 52.5145, 13.3501,
      { description: '5 or 10 km, everyone at their own pace.', sign: 'orange cap at the north side' }),
    meetup('m-karaoke', 'c-karaoke', 'p-tomas', 'Karaoke night', 5, '20:00', '23:30', 'Karaoke bar near Warschauer Straße', 52.5076, 13.4513,
      { description: 'Private room booked. First song is on Tomás.', sign: 'room 3', capacity: 10 }),
    meetup('m-books', 'c-books', 'p-elena', 'Book club: small table', 6, '18:30', '20:30', 'Bookshop café, Kreuzberg', 52.5009, 13.4244,
      { description: 'This month: a short novel of your choice, tell us in 3 minutes.', sign: 'corner table by the window', capacity: 4 }),
  ];
  const rsvps: DemoState['rsvps'] = [
    ...[ME, 'p-lukas', 'p-mateo', 'p-diego', 'p-aylin', 'p-jonas', 'p-amara'].map((u) => ({ meetupId: 'm-tempelhof', userId: u })),
    ...['p-omar', 'p-diego', 'p-amara'].map((u) => ({ meetupId: 'm-cowork', userId: u })),
    ...['p-diego', 'p-priya', 'p-mateo'].map((u) => ({ meetupId: 'm-run', userId: u })),
    ...['p-tomas', 'p-mei', 'p-kwame', 'p-hana'].map((u) => ({ meetupId: 'm-karaoke', userId: u })),
    ...['p-elena', 'p-chloe', 'p-sofia', 'p-lukas'].map((u) => ({ meetupId: 'm-books', userId: u })), // full (capacity 4)
  ].map((r) => ({ ...r, checkedInAt: null, sample: true }));

  const msg = (id: string, scope: { circleId?: string; meetupId?: string }, authorId: string, body: string, day: number, hhmm: string,
    extra: { replyTo?: string; mentions?: string[]; kind?: 'text' | 'poll'; pollId?: string } = {}) => ({
    id, circleId: scope.circleId ?? null, meetupId: scope.meetupId ?? null, authorId, body, kind: extra.kind ?? 'text',
    pollId: extra.pollId ?? null, replyTo: extra.replyTo ?? null, mentions: extra.mentions ?? [], createdAt: t(day, hhmm), deletedAt: null,
    sample: true });
  const messages: DemoState['messages'] = [
    msg('msg-1', { circleId: 'c-bbb' }, 'p-amara', 'Welcome to everyone who just joined! 👋 Say hi and tell us what brought you to Berlin.', -4, '09:12'),
    msg('msg-2', { circleId: 'c-bbb' }, 'p-mateo', 'Olá! Chef from São Paulo, here since spring. Happy to cook for the next potluck 🍲', -4, '10:03'),
    msg('msg-3', { circleId: 'c-bbb' }, 'p-chloe', 'Bonjour! PhD student, studying how people find their place in a new city. So… this group is research 😄', -3, '19:40'),
    msg('msg-4', { circleId: 'c-bbb' }, 'p-lukas', 'Anyone need help with Anmeldung appointments? I found a trick for getting a slot.', -2, '08:15'),
    msg('msg-5', { circleId: 'c-bbb' }, 'p-priya', 'Yes please! @You (demo) did you manage yours?', -2, '08:31', { replyTo: 'msg-4', mentions: [ME] }),
    msg('msg-6', { circleId: 'c-bbb' }, 'p-kwame', 'Co-working this week, who is in?', -1, '17:05'),
    msg('msg-7', { circleId: 'c-berlin' }, 'p-lukas', 'Weather looks good this week. Picnic at Tempelhof?', -2, '12:00'),
    msg('msg-8', { circleId: 'c-berlin' }, 'p-mateo', "I'll bring pão de queijo.", -2, '12:20'),
    msg('msg-9', { circleId: 'c-berlin' }, 'p-diego', 'Which time works best?', -1, '09:00', { kind: 'poll', pollId: 'poll-1' }),
    msg('msg-10', { circleId: 'c-karaoke' }, 'p-tomas', 'Song requests for karaoke night? I am preparing the queue 🎶', -1, '21:10'),
    msg('msg-11', { circleId: 'c-karaoke' }, 'p-mei', 'Total Eclipse of the Heart. Duet, anyone?', -1, '21:30'),
    msg('msg-12', { meetupId: 'm-tempelhof' }, 'p-aylin', 'I can bring a speaker, small one, promise.', -1, '15:00'),
    msg('msg-13', { meetupId: 'm-tempelhof' }, 'p-jonas', "I'll take some photos if everyone is okay with it.", -1, '15:20'),
  ];
  const reactions: DemoState['reactions'] = [
    ['msg-1', 'p-mei', '❤️'], ['msg-1', 'p-diego', '🙌'], ['msg-2', 'p-amara', '🔥'], ['msg-3', 'p-lukas', '😂'], ['msg-8', 'p-diego', '🔥'],
  ].map(([messageId, userId, emoji]) => ({ messageId, userId, emoji, sample: true }));
  const polls: DemoState['polls'] = [{ id: 'poll-1', circleId: 'c-berlin', question: 'Which time works best for the picnic?', closesAt: t(2, '10:00'),
    createdAt: t(-1, '09:00'), sample: true }];
  const pollOptions: DemoState['pollOptions'] = [
    { id: 'opt-1', pollId: 'poll-1', label: '12:00', sample: true },
    { id: 'opt-2', pollId: 'poll-1', label: '14:00', sample: true },
    { id: 'opt-3', pollId: 'poll-1', label: '16:00', sample: true },
  ];
  const pollVotes: DemoState['pollVotes'] = [['opt-2', 'p-lukas'], ['opt-2', 'p-mateo'], ['opt-1', 'p-aylin']]
    .map(([optionId, userId]) => ({ pollId: 'poll-1', optionId, userId, sample: true }));
  const pins: DemoState['pins'] = [
    { id: 'pin-1', circleId: 'c-bbb', authorId: ME, title: 'Welcome! Start here', body: 'Be kind, show up, bring a friend. Meetups are in the Meetups tab.',
      url: null, createdAt: t(-10, '10:00'), sample: true },
    { id: 'pin-2', circleId: 'c-bbb', authorId: 'p-lukas', title: 'Berlin paperwork survival guide', body: 'Anmeldung, tax ID, health insurance: the basics.',
      url: 'https://service.berlin.de/', createdAt: t(-8, '11:00'), sample: true },
  ];

  const notifications: DemoState['notifications'] = [
    { id: 'n-1', userId: ME, kind: 'mention', data: { author: 'Priya Raman', circle: 'BBB · Belong Beyond Borders', circle_id: 'c-bbb' },
      createdAt: t(-2, '08:31'), read: false, sample: true },
    { id: 'n-2', userId: ME, kind: 'meetup_new', data: { circle: 'Co-working & Networking', title: 'Co-working morning', meetup_id: 'm-cowork' },
      createdAt: t(-3, '18:00'), read: false, sample: true },
    { id: 'n-3', userId: ME, kind: 'proposal_new', data: { name: 'Language Exchange' }, createdAt: t(-1, '20:00'), read: false, sample: true },
    { id: 'n-4', userId: ME, kind: 'poll_new', data: { circle: 'Berlin Events', question: 'Which time works best for the picnic?', circle_id: 'c-berlin' },
      createdAt: t(-1, '09:00'), read: true, sample: true },
  ];

  return {
    version: 1,
    startedAt,
    me: { id: ME, viewAs: 'admin' },
    settings: { launchOpen: false, launchCode: null, vouchesRequired: 2 },
    profiles: [me, ...PEOPLE.map((p) => profile(p, startedAt))],
    circles,
    circleMembers,
    joinRequests: [{ id: 'jr-1', circleId: 'c-women', userId: 'p-chloe', status: 'pending', createdAt: t(-1, '11:00'), sample: true }],
    recommendations: [{ circleId: 'c-women', userId: 'p-chloe', byId: 'p-sofia', createdAt: t(-1, '11:30'), sample: true }],
    proposals: [{ id: 'prop-1', name: 'Language Exchange', description: 'Swap languages over coffee: German, Spanish, French and more.',
      emoji: '🗣️', visibility: 'open', proposerId: 'p-diego', cohosts: [], status: 'pending', adminNote: null, createdAt: t(-1, '20:00'), sample: true }],
    meetups,
    rsvps,
    messages,
    reactions,
    polls,
    pollOptions,
    pollVotes,
    pins,
    notifications,
    notificationPrefs: [],
    invites: [{ code: 'demoinvite', createdBy: ME, createdAt: t(-5, '12:00'), expiresAt: t(9, '12:00'), used: false, sample: true }],
    blocks: [],
    reports: [{ id: 'rep-1', reporterId: 'p-elena', targetType: 'message', targetId: 'msg-10', reason: 'Testing the report button 🙂',
      createdAt: t(-1, '22:00'), resolved: false, sample: true }],
    vouches: [
      { candidateId: 'p-ines', voucherId: 'p-mateo', createdAt: t(-1, '10:00'), sample: true },
      { candidateId: 'p-yusuf', voucherId: 'p-aylin', createdAt: t(-1, '12:00'), sample: true },
    ],
  };
}
