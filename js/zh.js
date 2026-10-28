/* 中文 for TT Elevator Dash. The page translates itself from this dictionary (kit/lang.js); names stay English. */
(function () {
  const HOTELS = { 'HOTEL CUPCAKE': '纸杯蛋糕酒店', 'HOTEL BANANA': '香蕉酒店', 'HOTEL PANDA': '熊猫酒店', 'HOTEL ROCKET': '火箭酒店', 'HOTEL RAINBOW': '彩虹酒店' };
  const ARROWS = '([⬆⬇⬅➡])';
  Kit.lang.keep(['TEDDY', 'TOMMY', 'FOXY', 'FROGGY', 'Teddy', 'Tommy', 'Foxy', 'Froggy', ED.TITLE, 'Claude Code', 'Esc']);
  Kit.lang.add(Object.assign({}, HOTELS, {
    // title
    'Ride the lifts down the toy hotel and deliver every parcel!': '坐电梯走遍玩具酒店，把每个包裹都送到！',
    PLAYERS: '玩家', COURIER: '快递员', LEVEL: '难度',
    'Foxy & Froggy cheer you on': 'Foxy 和 Froggy 给你加油',
    'Teddy & Tommy take turns': 'Teddy 和 Tommy 轮流玩',
    'boxing champ': '拳击冠军', 'peace sign pro': '比耶高手',
    'slow robots · 5 lives': '机器人慢 · 5 条命',
    'fast robots · towels · 3 lives': '机器人快 · 会扔毛巾 · 3 条命',
    '▶ DELIVER!': '▶ 送快递！',
    walk: '走路', 'ride a lift (stand in it)': '坐电梯（站进去）', 'toss a pillow · duck': '扔枕头 · 蹲下',
    '◀ ▶ walk, ▲ ▼ ride the lifts, ☁️ tosses a pillow, 🙇 ducks. Tap your brother\'s face to call him!': '◀ ▶ 走路，▲ ▼ 坐电梯，☁️ 扔枕头，🙇 蹲下。点兄弟的脸叫他来！',
    '↻ Turn sideways for a bigger hotel!': '↻ 横过来玩，酒店更大！',
    Players: '玩家', Courier: '快递员', Difficulty: '难度',
    // HUD and touch
    'HI-SCORE': '最高分', PARCELS: '包裹', 'HIGH FIVE': '击掌', PILLOW: '枕头', DUCK: '蹲下', CALL: '叫人',
    ROOF: '楼顶', GARAGE: '车库',
    'Pause (P)': '暂停 (P)', Pause: '暂停', 'Sound (M)': '声音 (M)', 'Sound on or off': '声音 开或关', 'Sound on / off (M)': '声音 开 / 关 (M)',
    'Ride up': '电梯上楼', 'Walk left': '往左走', 'Walk right': '往右走', 'Ride down': '电梯下楼',
    // big words, pops, toasts
    'ALL PARCELS DELIVERED!': '包裹全送到啦！', 'NOW RIDE DOWN TO THE GARAGE 🚐': '快坐电梯下到车库 🚐',
    'HOTEL DONE!': '酒店完成！', 'ALL 5 HOTELS!': '5 家酒店全送完！', 'SUPER COURIER!': '超级快递员！',
    'BOING! +100': '咚！+100', 'SORRY!': '对不起！', 'WHOOSH! +50': '嗖！+50', 'FLUMP!': '噗！', 'OOF!': '哎哟！',
    'THANK YOU! +500': '谢谢你！+500', '1 PARCEL LEFT!': '还剩 1 个包裹！', 'EXTRA LIFE!': '多一条命！',
    'HIGH FIVE! ✋ +50': '击掌！✋ +50',
    // pause, results
    'P · Esc · Space to go on · Q for the menu · M sound': 'P · Esc · 空格 继续 · Q 回菜单 · M 声音',
    '↻ PLAY AGAIN': '↻ 再玩一次', 'Enter: play again · Esc: menu': '回车：再玩一次 · Esc：菜单',
    'ALL DELIVERED!': '全部送到啦！', 'GREAT DELIVERING!': '送得真棒！', "IT'S A TIE!": '平手！',
    '⭐ NEW HI-SCORE!': '⭐ 新纪录！', '⭐ ON THE BOARD!': '⭐ 上榜啦！',
    '🐣 TOP COURIERS': '🐣 快递高手榜', '🔥 TOP COURIERS': '🔥 快递高手榜',
    // the ? panel
    'ride a lift: stand in it, then up or down': '坐电梯：站进去，再按上或下',
    'toss a pillow': '扔枕头', 'duck under towels': '蹲下躲毛巾',
    'call your brother: he delivers the next parcel (2 players: high five)': '叫兄弟来：他帮你送下一个包裹（双人：击掌）',
    'title: 1 or 2 players · easy · normal · courier': '标题页：1 或 2 个人 · 简单 · 普通 · 换人',
    'Start on the roof and work your way down. Take each parcel to the door with the glowing light, in order (1, 2, 3...). Stand at a lift and it comes to you; it stops at every floor. A pillow makes a bellhop robot dizzy. When every parcel is delivered, ride down to the van in the garage!':
      '从楼顶出发，一层一层往下走。把包裹按顺序（1、2、3……）送到亮着灯的门口。站在电梯门口，电梯就会来接你；它每个楼层都会停。扔枕头能把门童机器人砸晕。包裹全送完，就坐电梯下到车库，跳上快递车！',
    "◀ ▶ walk, ▲ ▼ ride the lifts, ☁️ tosses a pillow, 🙇 ducks, and your brother's face calls him.": '◀ ▶ 走路，▲ ▼ 坐电梯，☁️ 扔枕头，🙇 蹲下，点兄弟的脸叫他来。',
    'LOADING…': '加载中…',
  }));
  const hotel = (s) => HOTELS[s] || s;
  Kit.lang.rule(/^HOTEL (\d) OF (\d)$/, '第 $1 家酒店（共 $2 家）');
  Kit.lang.rule(/^HOTEL (\d) · FLOOR (\d+)$/, '第 $1 家酒店 · $2 楼');
  Kit.lang.rule(/^HOTEL (\d) · (ROOF|GARAGE)$/, (m, n, w) => `第 ${n} 家酒店 · ${w === 'ROOF' ? '楼顶' : '车库'}`);
  Kit.lang.rule(new RegExp(`^NEXT: FLOOR (\\d+) ${ARROWS}$`), '下一个：$1 楼 $2');
  Kit.lang.rule(new RegExp(`^NEXT: HERE ${ARROWS}$`), '下一个：就在这层 $1');
  Kit.lang.rule(new RegExp(`^GARAGE ${ARROWS}$`), '去车库 $1');
  Kit.lang.rule(/^BONUS \+([\d,]+)$/, '奖励 +$1');
  Kit.lang.rule(/^CALL (\w+)$/, '叫 $1');
  Kit.lang.rule(/^(\w+)'S TURN!$/, '轮到 $1 啦！');
  Kit.lang.rule(/^(\w+) SAYS: I'LL TAKE PARCEL (\d)!$/, '$1 说：第 $2 个包裹我来送！');
  Kit.lang.rule(/^(\w+) SAYS: GO TO THE GARAGE!$/, '$1 说：快去车库！');
  Kit.lang.rule(/^PARCEL (\d) DELIVERED!$/, '第 $1 个包裹送到啦！');
  Kit.lang.rule(/^PARCEL (\d) FIRST!$/, '先送第 $1 个包裹！');
  Kit.lang.rule(/^(\d) PARCELS LEFT!$/, '还剩 $1 个包裹！');
  Kit.lang.rule(/^(\w+) IS OUT OF LIVES$/, '$1 没有命啦');
  Kit.lang.rule(/^HI-SCORE ([\d,]+) · (\w+)$/, '最高分 $1 · $2');
  Kit.lang.rule(/^(\w+) WINS!$/, '$1 赢啦！');
  Kit.lang.rule(/^(\w+) ([\d,]+) · (\w+) ([\d,]+)$/, '$1 $2 分 · $3 $4 分');
  Kit.lang.rule(/^([\d,]+) points · hotel (\d) of (\d)$/, '$1 分 · 第 $2 家酒店（共 $3 家）');
  Kit.lang.rule(/^(\S+) \+100$/, '$1 +100');
  Kit.lang.rule(/^(HOTEL [A-Z]+)$/, (m, h) => hotel(h));
})();
