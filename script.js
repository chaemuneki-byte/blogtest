// Dark mode functionality
const initDarkMode = () => {
    const darkToggle = document.getElementById('darkToggle');
    const darkToggleMobile = document.getElementById('darkToggleMobile');

    // Check for saved theme preference or default to 'light'
    const currentTheme = localStorage.getItem('theme') || 'light';

    if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
    }

    const toggleDarkMode = () => {
        document.documentElement.classList.toggle('dark');
        const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
    };

    darkToggle?.addEventListener('click', toggleDarkMode);
    darkToggleMobile?.addEventListener('click', toggleDarkMode);
};

// Mobile menu functionality
const initMobileMenu = () => {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    mobileMenuBtn?.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        const icon = mobileMenuBtn.querySelector('i');

        if (mobileMenu.classList.contains('hidden')) {
            icon.className = 'fas fa-bars';
        } else {
            icon.className = 'fas fa-times';
        }
    });

    // Close mobile menu when clicking on links
    const mobileMenuLinks = mobileMenu?.querySelectorAll('a');
    mobileMenuLinks?.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            mobileMenuBtn.querySelector('i').className = 'fas fa-bars';
        });
    });
};

// Smooth scrolling for anchor links
const initSmoothScroll = () => {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').slice(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                const headerHeight = document.getElementById('header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
};

// Header scroll effect
const initHeaderScroll = () => {
    const header = document.getElementById('header');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            header.classList.add('backdrop-blur-md', 'bg-white/80', 'dark:bg-gray-900/80');
        } else {
            header.classList.remove('backdrop-blur-md', 'bg-white/80', 'dark:bg-gray-900/80');
        }
    });
};

// Reviews carousel functionality
const initReviewsCarousel = () => {
    const carousel = document.getElementById('reviewsCarousel');
    const prevBtn = document.getElementById('prevReview');
    const nextBtn = document.getElementById('nextReview');

    if (!carousel) return;

    let currentSlide = 0;
    const totalSlides = carousel.children.length;
    let autoPlayInterval;

    const updateCarousel = () => {
        const slideWidth = carousel.children[0].offsetWidth;
        carousel.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
    };

    const nextSlide = () => {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateCarousel();
    };

    const prevSlide = () => {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateCarousel();
    };

    const startAutoPlay = () => {
        autoPlayInterval = setInterval(nextSlide, 5000);
    };

    const stopAutoPlay = () => {
        clearInterval(autoPlayInterval);
    };

    // Event listeners
    nextBtn?.addEventListener('click', () => {
        stopAutoPlay();
        nextSlide();
        startAutoPlay();
    });

    prevBtn?.addEventListener('click', () => {
        stopAutoPlay();
        prevSlide();
        startAutoPlay();
    });

    // Mouse events for auto-play control
    carousel.addEventListener('mouseenter', stopAutoPlay);
    carousel.addEventListener('mouseleave', startAutoPlay);

    // Touch/swipe support for mobile
    let startX = 0;
    let isDragging = false;

    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        stopAutoPlay();
    });

    carousel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
    });

    carousel.addEventListener('touchend', (e) => {
        if (!isDragging) return;

        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;

        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }

        isDragging = false;
        startAutoPlay();
    });

    // Start auto-play and handle window resize
    startAutoPlay();
    window.addEventListener('resize', updateCarousel);
};

// Contact form handling
const initContactForm = () => {
    const contactForm = document.getElementById('contactForm');

    contactForm?.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(contactForm);
        const nameInput = contactForm.querySelector('input[type="text"]');
        const emailInput = contactForm.querySelector('input[type="email"]');
        const messageInput = contactForm.querySelector('textarea');

        const name = nameInput?.value.trim();
        const email = emailInput?.value.trim();
        const message = messageInput?.value.trim();

        // Basic validation
        if (!name || !email || !message) {
            showToast('모든 필수 항목을 입력해주세요.', 'error');
            return;
        }

        if (message.length < 10) {
            showToast('문의내용을 10자 이상 입력해주세요.', 'error');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('올바른 이메일 주소를 입력해주세요.', 'error');
            return;
        }

        // Simulate form submission
        showToast('문의가 접수되었습니다. 24시간 내 회신드리겠습니다.', 'success');
        contactForm.reset();
    });
};

// Toast notification system
const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-20 right-4 p-4 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);

    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
};

// Scroll to top button
const initScrollToTop = () => {
    const scrollTopBtn = document.getElementById('scrollTop');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn?.classList.remove('opacity-0');
            scrollTopBtn?.classList.add('opacity-100');
        } else {
            scrollTopBtn?.classList.add('opacity-0');
            scrollTopBtn?.classList.remove('opacity-100');
        }
    });

    scrollTopBtn?.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
};

// KakaoTalk button functionality
const initKakaoButtons = () => {
    const kakaoButtons = document.querySelectorAll('button');
    const fixedKakao = document.getElementById('fixedKakao');

    const handleKakaoClick = () => {
        showToast('카카오톡 상담으로 연결됩니다.', 'info');
        // In a real implementation, this would open the actual KakaoTalk channel
        // window.open('https://pf.kakao.com/_your_channel_id', '_blank');
    };

    kakaoButtons.forEach(button => {
        if (button.textContent.includes('카카오')) {
            button.addEventListener('click', handleKakaoClick);
        }
    });

    fixedKakao?.addEventListener('click', handleKakaoClick);
};

// Button hover effects and animations
const initAnimations = () => {
    // Add scroll animations to elements
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fadeInUp');
            }
        });
    }, observerOptions);

    // Observe feature cards and other sections
    const animateElements = document.querySelectorAll('#features > div > div, #reviews > div, #pricing > div > div, #contact > div');
    animateElements.forEach((el) => {
        el.classList.add('animate-on-scroll');
        observer.observe(el);
    });

    // Add custom CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .animate-fadeInUp {
            animation: fadeInUp 0.6s ease-out forwards;
        }

        .animate-on-scroll {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease-out;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: #f1f1f1;
        }

        .dark ::-webkit-scrollbar-track {
            background: #374151;
        }

        ::-webkit-scrollbar-thumb {
            background: #FF6B6B;
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: #ff5252;
        }

        /* Loading animation for buttons */
        .loading {
            position: relative;
            color: transparent;
        }

        .loading::after {
            content: '';
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 20px;
            height: 20px;
            border: 2px solid currentColor;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        /* Hover effects for cards */
        .hover-card {
            transition: all 0.3s ease;
        }

        .hover-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
    `;
    document.head.appendChild(style);
};

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    initMobileMenu();
    initSmoothScroll();
    initHeaderScroll();
    initReviewsCarousel();
    initContactForm();
    initScrollToTop();
    initKakaoButtons();
    initAnimations();

    // Add hover-card class to feature cards and pricing cards
    const cards = document.querySelectorAll('#features .bg-white, #pricing .bg-white');
    cards.forEach(card => card.classList.add('hover-card'));

    console.log('블로그랩 랜딩페이지가 초기화되었습니다.');
});