# Squad Wars X posts (no Premium: 280 characters a post, video up to 2:20, links go in a reply).
# Run: python social/posts.py  -> prints every post with its length and writes social/posts.txt
P = {}

P['bio'] = """The pump.fun $2.5M Squads Competition, as a live race. Every squad is a car. Its profit is its position. $SQUADS
Not affiliated with pump.fun."""

P['1_launch_clip'] = """pump.fun put $2,500,000 on the line.

962 squads. Two weeks. One leaderboard.

So we turned it into a race."""

P['1_launch_clip_reply'] = """Watch it live. Click any squad to see its profit, its members and what it's holding:
https://squadsgp.vercel.app"""

P['2_how'] = """How Squad Wars works:

Every squad in the pump.fun competition is a car.
Its profit decides its position.
The gap between cars is the gap in dollars.

When a squad pumps, you watch it overtake."""

P['3_pitwall'] = """The best part isn't the race.

It's the Pit Wall: what the top 10 squads are holding, live.

When 3 of the top 10 squads hold the same coin, you see it first."""

P['4_question'] = """962 squads are fighting for $1,500,000.

Two weeks left. Who takes it?"""

P['5_ticker'] = """$SQUADS

The race is live. The coin is the pit pass."""

P['T_daily_report'] = """Squad Wars, day [D] of 14

P1 [SQUAD 1] [+$X]
P2 [SQUAD 2] [+$X]
P3 [SQUAD 3] [+$X]

Biggest move: [SQUAD] [+$X]
Most held by the top 10: $[TICKER]"""

P['T_overtake'] = """OVERTAKE

[SQUAD A] passes [SQUAD B] for P[N] in the $2.5M pump.fun Squads race.

Gap to the leader: [$X]"""

P['T_new_leader'] = """NEW LEADER

[SQUAD] takes P1 in the pump.fun Squads Competition, [+$X] after [D] days.

$1,500,000 is theirs to lose."""

P['T_launch'] = """$SQUADS is live.

The $2.5M pump.fun Squads race, broadcast live: every squad a car, every overtake on screen, every leader's bag on the Pit Wall.

CA in the reply."""

P['T_launch_reply'] = """CA: [CA]

Site: https://squadsgp.vercel.app"""

import os
out = []
for k, v in P.items():
    n = len(v)
    limit = 160 if k == 'bio' else 280
    assert n <= limit, (k, n)
    out.append(f'===== {k}  ({n}/{limit}) =====\n{v}\n')
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'posts.txt'), 'w', encoding='utf-8').write('\n'.join(out))
print('\n'.join(out))
