const express = require('express');
const router = express.Router();
const { chatbotValidation } = require('../middleware/validation');

// Multilingual response system for library queries
const generateResponse = (message, language = 'en') => {
  const lowerMessage = message.toLowerCase();
  
  // Response templates for different languages
  const responses = {
    en: {
      bookSearch: "You can search for books using the search bar on the Books page. You can filter by title, author, or category.",
      bookBorrow: "Currently, our digital library allows you to read books online. Physical borrowing will be available soon!",
      bookUpload: "To upload a book, you need admin privileges. Please contact the library administrator.",
      bookGeneral: "We have a wide collection of books available. You can browse them on the Books page or use the search function.",
      eventUpcoming: "You can view all upcoming events on the Events page. New events are added regularly!",
      eventRegister: "To register for events, please visit the Events page and click on the event you're interested in.",
      eventGeneral: "We host various events including book clubs, author talks, and workshops. Check the Events page for details.",
      hours: "Our digital library is available 24/7! For physical library hours, please contact the administration.",
      help: "I'm here to help! You can ask me about books, events, library services, or general questions.",
      hello: "Hello! I'm your library assistant. How can I help you today?",
      register: "To access all features and save your reading history, please register for a free account. Click 'Sign Up' in the top menu!",
      login: "You can log in using your email and password. If you don't have an account, please sign up first!",
      default: "I'm not sure about that. You can ask me about books, events, library services, or browse our website for more information."
    },
    uz: {
      bookSearch: "Kitoblarni qidirish uchun Kitoblar sahifasidagi qidiruv panelidan foydalanishingiz mumkin. Sarlavha, muallif yoki kategoriya bo'yicha filtrlashingiz mumkin.",
      bookBorrow: "Hozirda bizning raqamli kutubxonamiz kitoblarni onlayn o'qish imkonini beradi. Jismoniy o'qish tez orada mavjud bo'ladi!",
      bookUpload: "Kitob yuklash uchun administrator huquqlari kerak. Iltimos, kutubxona ma'muriga murojaat qiling.",
      bookGeneral: "Bizda keng kitoblar to'plami mavjud. Ularni Kitoblar sahifasida ko'rib chiqishingiz yoki qidiruv funksiyasidan foydalanishingiz mumkin.",
      eventUpcoming: "Barcha kelgusi tadbirlarni Tadbirlar sahifasida ko'rishingiz mumkin. Yangi tadbirlar muntazam qo'shiladi!",
      eventRegister: "Tadbillarga ro'yxatdan o'tish uchun Tadbirlar sahifasiga tashrif buyuring va sizni qiziqtirgan tadbirni bosing.",
      eventGeneral: "Biz turli xil tadbirlarni o'tkazamiz, jumladan kitob klublari, mualliflar bilan suhbatlar va ustaxonalar. Batafsil ma'lumot uchun Tadbirlar sahifasini tekshiring.",
      hours: "Bizning raqamli kutubxonamiz 24/7 mavjud! Jismoniy kutubxona soatlarini bilish uchun ma'muriyat bilan bog'laning.",
      help: "Men yordam berish uchun tayyorman! Menga kitoblar, tadbirlar, kutubxona xizmatlari yoki umumiy savollar haqida so'rashingiz mumkin.",
      hello: "Salom! Men sizning kutubxona yordamchisiman. Bugun sizga qanday yordam bera olaman?",
      register: "Barcha funksiyalarga kirish va o'qish tarixingizni saqlash uchun bepul hisob yarating. Yuqori menyudagi 'Ro'yxatdan o'tish' tugmasini bosing!",
      login: "Elektron pochta va parolingiz bilan tizimga kirishingiz mumkin. Agar hisobingiz yo'q bo'lsa, avval ro'yxatdan o'ting!",
      default: "Men bu haqda aniq emasman. Menga kitoblar, tadbirlar, kutubxona xizmatlari haqida so'rashingiz yoki veb-saytimizda ko'rib chiqishingiz mumkin."
    },
    ru: {
      bookSearch: "Вы можете искать книги, используя панель поиска на странице Книги. Вы можете фильтровать по названию, автору или категории.",
      bookBorrow: "В настоящее время наша цифровая библиотека позволяет читать книги онлайн. Физическое заимствование будет доступно в ближайшее время!",
      bookUpload: "Для загрузки книги нужны права администратора. Пожалуйста, обратитесь к администратору библиотеки.",
      bookGeneral: "У нас есть большая коллекция книг. Вы можете просматривать их на странице Книги или использовать функцию поиска.",
      eventUpcoming: "Вы можете просмотреть все предстоящие мероприятия на странице События. Новые события добавляются регулярно!",
      eventRegister: "Для регистрации на мероприятия посетите страницу События и нажмите на интересующее вас событие.",
      eventGeneral: "Мы проводим различные мероприятия, включая книжные клубы, встречи с авторами и мастер-классы. Подробности смотрите на странице События.",
      hours: "Наша цифровая библиотека доступна 24/7! Для получения информации о часах работы физической библиотеки обратитесь к администрации.",
      help: "Я здесь, чтобы помочь! Вы можете спросить меня о книгах, событиях, услугах библиотеки или общих вопросах.",
      hello: "Привет! Я ваш помощник библиотеки. Как я могу помочь вам сегодня?",
      register: "Для доступа ко всем функциям и сохранения истории чтения, пожалуйста, зарегистрируйтесь для бесплатного аккаунта. Нажмите 'Регистрация' в верхнем меню!",
      login: "Вы можете войти, используя свой email и пароль. Если у вас нет аккаунта, пожалуйста, сначала зарегистрируйтесь!",
      default: "Я не уверен в этом. Вы можете спросить меня о книгах, событиях, услугах библиотеки или просмотреть наш веб-сайт для получения дополнительной информации."
    }
  };

  const lang = responses[language] || responses.en;
  
  // Registration and login queries
  if (lowerMessage.includes('register') || lowerMessage.includes('signup') || lowerMessage.includes('sign up') ||
      (language === 'uz' && lowerMessage.includes('ro\'yxat')) ||
      (language === 'ru' && lowerMessage.includes('регистрация'))) {
    return lang.register;
  }
  
  if (lowerMessage.includes('login') || lowerMessage.includes('signin') || lowerMessage.includes('sign in') ||
      (language === 'uz' && lowerMessage.includes('kirish')) ||
      (language === 'ru' && lowerMessage.includes('вход'))) {
    return lang.login;
  }
  
  // Book-related queries
  if (lowerMessage.includes('book') || lowerMessage.includes('read') || 
      (language === 'uz' && (lowerMessage.includes('kitob') || lowerMessage.includes('o\'qish'))) ||
      (language === 'ru' && (lowerMessage.includes('книга') || lowerMessage.includes('читать')))) {
    if (lowerMessage.includes('find') || lowerMessage.includes('search') ||
        (language === 'uz' && lowerMessage.includes('qidirish')) ||
        (language === 'ru' && lowerMessage.includes('найти'))) {
      return lang.bookSearch;
    }
    if (lowerMessage.includes('borrow') || lowerMessage.includes('checkout') ||
        (language === 'uz' && lowerMessage.includes('olish')) ||
        (language === 'ru' && lowerMessage.includes('взять'))) {
      return lang.bookBorrow;
    }
    if (lowerMessage.includes('upload') || lowerMessage.includes('add') ||
        (language === 'uz' && lowerMessage.includes('yuklash')) ||
        (language === 'ru' && lowerMessage.includes('загрузить'))) {
      return lang.bookUpload;
    }
    return lang.bookGeneral;
  }
  
  // Event-related queries
  if (lowerMessage.includes('event') || lowerMessage.includes('activity') ||
      (language === 'uz' && lowerMessage.includes('tadbir')) ||
      (language === 'ru' && lowerMessage.includes('событие'))) {
    if (lowerMessage.includes('upcoming') || lowerMessage.includes('schedule') ||
        (language === 'uz' && lowerMessage.includes('kelgusi')) ||
        (language === 'ru' && lowerMessage.includes('предстоящий'))) {
      return lang.eventUpcoming;
    }
    if (lowerMessage.includes('register') || lowerMessage.includes('join') ||
        (language === 'uz' && lowerMessage.includes('ro\'yxat')) ||
        (language === 'ru' && lowerMessage.includes('зарегистрироваться'))) {
      return lang.eventRegister;
    }
    return lang.eventGeneral;
  }
  
  // General library queries
  if (lowerMessage.includes('hours') || lowerMessage.includes('open') ||
      (language === 'uz' && lowerMessage.includes('soat')) ||
      (language === 'ru' && lowerMessage.includes('часы'))) {
    return lang.hours;
  }
  
  if (lowerMessage.includes('help') || lowerMessage.includes('support') ||
      (language === 'uz' && lowerMessage.includes('yordam')) ||
      (language === 'ru' && lowerMessage.includes('помощь'))) {
    return lang.help;
  }
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') ||
      (language === 'uz' && lowerMessage.includes('salom')) ||
      (language === 'ru' && lowerMessage.includes('привет'))) {
    return lang.hello;
  }
  
  // Default response
  return lang.default;
};

// POST /api/chatbot/message
router.post('/message', chatbotValidation.message, async (req, res) => {
  try {
    const { message, language = 'en' } = req.body;
    
    // Generate AI response
    const response = generateResponse(message, language);
    
    // Add a small delay to simulate processing
    setTimeout(() => {
      res.json({ 
        response,
        timestamp: new Date().toISOString()
      });
    }, 500);
    
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 