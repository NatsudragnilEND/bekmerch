const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const schedule = require('node-schedule');
require('dotenv').config();

// Настройка Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Настройка Telegram-бота
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Настройка Express
const app = express();
const PORT = process.env.PORT || 3001;
app.use(bodyParser.json());

// Настройка CORS
const corsOptions = {
  origin: ['http://localhost:3000', 'https://baguvix-mini-app.vercel.app'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Авторизация через Telegram
app.get('/auth/telegram', async (req, res) => {
  const { id, username, hash } = req.query;

  // Data is valid, authenticate the user
  const { data, error } = await supabase
    .from('usersa')
    .select('*')
    .eq('telegram_id', id)
    .single();

  if (error && error.code === 'PGRST116') {
    // User not found, create a new user
    const { error: insertError } = await supabase
      .from('usersa')
      .insert([{ telegram_id: id, username }]);

    if (insertError) {
      return res.status(500).json({ error: 'Ошибка при создании пользователя' });
    }

    return 'login success';
  }

  return res.json(data);
});

// Управление контентом
app.get('/api/content/materials', async (req, res) => {
  const { format, category, search, sort } = req.query;
  let query = supabase.from('materials').select('*');

  if (format) {
    query = query.eq('format', format);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (sort) {
    query = query.order(sort);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: 'Ошибка при получении материалов' });
  }

  res.json(data);
});

app.post('/api/admin/add-material', async (req, res) => {
  const { title, description, content, format, category, videoUrl } = req.body;

  const { data, error } = await supabase
    .from('materials')
    .insert([{ title, description, content, format, category, video_url: videoUrl }]);

  if (error) {
    return res.status(500).json({ error: 'Ошибка при добавлении материала' });
  }

  res.json(data);
});

app.put('/api/admin/edit-material/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, content, format, category, videoUrl } = req.body;

  const { data, error } = await supabase
    .from('materials')
    .update({ title, description, content, format, category, video_url: videoUrl })
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: 'Ошибка при обновлении материала' });
  }

  res.json(data);
});

app.delete('/api/admin/delete-material/:id', async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('materials')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: 'Ошибка при удалении материала' });
  }

  res.json(data);
});

// Управление подписками
app.post('/api/subscription/subscribe', async (req, res) => {
  const { userId, level, duration } = req.body;

  const { data, error } = await supabase
    .from('subscriptions')
    .insert([{ user_id: userId, level, start_date: new Date(), end_date: new Date(new Date().setMonth(new Date().getMonth() + duration)) }]);

  if (error) {
    console.log(error);
    return res.status(500).json({ error: 'Ошибка при создании подписки' });
  }

  res.json(data);
});

app.get('/api/subscription/status/:userId', async (req, res) => {
  const { userId } = req.params;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('end_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return res.status(500).json({ error: 'Ошибка при получении статуса подписки' });
  }

  res.json(data);
});

app.post('/api/subscription/extend', async (req, res) => {
  const { userId, planId } = req.body;

  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('end_date', { ascending: false })
    .limit(1)
    .single();

  if (fetchError) {
    console.log(userId);
    console.log(fetchError);
    return res.status(500).json({ error: 'Ошибка при получении подписки' });
  }

  let newEndDate;
  if (subscription.end_date) {
    newEndDate = new Date(subscription.end_date);
  } else {
    newEndDate = new Date(); // Set to current date if end_date is null
  }

  // Assuming planId corresponds to the duration in months
  const duration = planId === 1 ? 1 : planId === 2 ? 6 : 12;
  newEndDate.setMonth(newEndDate.getMonth() + duration);

  const { data, error } = await supabase
    .from('subscriptions')
    .update({ end_date: newEndDate })
    .eq('id', subscription.id);

  if (error) {
    console.log(error);
    console.log('Error extending subscription');
    return res.status(500).json({ error: 'Ошибка при продлении подписки' });
  }

  res.json(data);
});

// Интеграция с Robokassa
const merchantLogin = process.env.ROBOKASSA_LOGIN;
const password1 = process.env.ROBOKASSA_PASSWORD1;
const password2 = process.env.ROBOKASSA_PASSWORD2;

function generateSignature(params) {
  const sortedParams = Object.keys(params).sort();
  let str = sortedParams.map(key => `${key}:${params[key]}`).join(':');
  str += `:${password1}`;
  return crypto.createHash('md5').update(str).digest('hex');
}

function generatePaymentLink(userId, level, duration, amount) {
  const invId = `${userId}_${level}_${duration}`;
  const params = {
    MrchLogin: merchantLogin,
    OutSum: amount,
    InvId: invId,
    Desc: `Подписка Уровень ${level} на ${duration} месяцев`,
    SignatureValue: generateSignature({ MrchLogin: merchantLogin, OutSum: amount, InvId: invId, Desc: `Подписка Уровень ${level} на ${duration} месяцев` }),
    IsTest: 0,
  };

  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  return `https://auth.robokassa.ru/Merchant/Index.aspx?${queryString}`;
}

app.post('/api/payment/callback', async (req, res) => {
  const { OutSum, InvId, SignatureValue } = req.body;
  const params = { OutSum, InvId, MrchLogin: merchantLogin };
  const signature = generateSignature(params);

  if (signature !== SignatureValue) {
    return res.status(400).send('Неверная подпись');
  }

  // Обработка успешного платежа
  const [userId, level, duration] = InvId.split('_');
  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('end_date', { ascending: false })
    .limit(1)
    .single();

  if (fetchError) {
    return res.status(500).json({ error: 'Ошибка при получении подписки' });
  }

  const newEndDate = new Date(subscription ? subscription.end_date : new Date());
  newEndDate.setMonth(newEndDate.getMonth() + parseInt(duration));

  const { data, error } = await supabase
    .from('subscriptions')
    .upsert([{ user_id: userId, level, start_date: new Date(), end_date: newEndDate }]);

  if (error) {
    return res.status(500).json({ error: 'Ошибка при обновлении подписки' });
  }

  bot.sendMessage(userId, 'Оплата прошла успешно! Ваша подписка продлена.');

  res.send('OK');
});

// Уведомления о подписке
schedule.scheduleJob('0 0 * * *', async () => {
  const today = new Date();
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  // Format dates as ISO strings
  const todayISO = today.toISOString();
  const threeDaysFromNowISO = threeDaysFromNow.toISOString();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .lte('end_date', threeDaysFromNowISO)
    .gte('end_date', todayISO);

  if (error) {
    console.error('Ошибка при получении подписок для уведомлений', error);
    return;
  }

  data.forEach(subscription => {
    const daysLeft = Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24));
    bot.sendMessage(subscription.user_id, `Ваша подписка истекает через ${daysLeft} дня(ей). Продлите подписку, чтобы не потерять доступ к контенту.`);
  });
});

// Telegram-бот
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  // Проверка и добавление пользователя в базу данных
  const { data: user, error } = await supabase
    .from('usersa')
    .select('*')
    .eq('telegram_id', chatId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Пользователь не найден, добавляем его
    await supabase
      .from('usersa')
      .insert([{ telegram_id: chatId, username: msg.chat.username, first_name: msg.chat.first_name, last_name: msg.chat.last_name }]);
  }

  bot.sendMessage(chatId, 'Привет! Добро пожаловать в BAGUVIX CLUB! Здесь ты найдешь... У нас есть два уровня подписки:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Уровень 1', callback_data: 'level_1' }],
        [{ text: 'Уровень 2', callback_data: 'level_2' }],
        [{ text: 'Подробнее о подписках', url: 'https://telegra.ph/detali_podpiski' }],
        [{ text: 'Открыть мини-приложение', callback_data: 'open_app' }],
      ],
    },
  });
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Fetch the user_id from the usersa table using the telegram_id
  const { data: user, error } = await supabase
    .from('usersa')
    .select('id')
    .eq('telegram_id', chatId)
    .single();

  if (error) {
    console.error('Ошибка при получении пользователя', error);
    return bot.sendMessage(chatId, 'Произошла ошибка при получении информации о пользователе.');
  }

  const userId = user.id;

  if (data.startsWith('pay_')) {
    const [level, duration] = data.split('_').slice(1);
    const amount = calculateAmount(level, duration);
    const paymentLink = generatePaymentLink(userId, level, duration, amount);
    bot.sendMessage(chatId, `Оплатите подписку по ссылке: ${paymentLink}`);
  } else if (data === 'open_app') {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !subscription || new Date(subscription.end_date) < new Date()) {
      bot.sendMessage(chatId, 'У вас нет активной подписки. Подпишитесь на один из тарифов.');
    } else {
      const miniAppUrl = 'https://baguvix-mini-app.vercel.app';
      bot.sendMessage(chatId, 'Открыnть мини-приложение', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Открыть мини-приложение', url: miniAppUrl }],
          ],
        },
      });
    }
  } else if (data === 'level_1') {
    bot.sendMessage(chatId, 'Подписка на Уровень 1 дает доступ к нашему каналу с эксклюзивными материалами и мини-приложению. Выбери срок подписки:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: `■ Кнопка 1: "1 месяц - [${calculateAmount(1, 1)}] руб"`, callback_data: 'duration_1_1' }],
          [{ text: `■ Кнопка 2: "3 месяца - [${calculateAmount(1, 3)}] руб"`, callback_data: 'duration_3_1' }],
          [{ text: `■ Кнопка 3: "6 месяцев - [${calculateAmount(1, 6)}] руб"`, callback_data: 'duration_6_1' }],
          [{ text: `■ Кнопка 4: "1 год - [${calculateAmount(1, 12)}] руб"`, callback_data: 'duration_12_1' }],
        ],
      },
    });
  } else if (data === 'level_2') {
    bot.sendMessage(chatId, 'Подписка на Уровень 2 включает доступ к каналу, мини-приложению и закрытому чату. Выбери срок подписки:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: `■ Кнопка 1: "1 месяц - [${calculateAmount(2, 1)}] руб"`, callback_data: 'duration_1_2' }],
          [{ text: `■ Кнопка 2: "3 месяца - [${calculateAmount(2, 3)}] руб"`, callback_data: 'duration_3_2' }],
          [{ text: `■ Кнопка 3: "6 месяцев - [${calculateAmount(2, 6)}] руб"`, callback_data: 'duration_6_2' }],
          [{ text: `■ Кнопка 4: "1 год - [${calculateAmount(2, 12)}] руб"`, callback_data: 'duration_12_2' }],
        ],
      },
    });
  } else if (data.startsWith('duration_')) {
    const [duration, level] = data.split('_').slice(1);
    bot.sendMessage(chatId, `Отлично, подписка на Уровень ${level} на ${duration} месяц(ев). Для оформления нажмите 'Оплатить'.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: `Оплатить`, callback_data: `pay_${level}_${duration}` }],
        ],
      },
    });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

function calculateAmount(level, duration) {
  const prices = {
    level_1: {
      '1': 4990,
      '3': 13390,
      '6': 25390,
      '12': 47890,
    },
    level_2: {
      '1': 9990,
      '3': 26390,
      '6': 49390,
      '12': 94890,
    },
  };

  return prices[`level_${level}`][duration];
}
