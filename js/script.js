document.addEventListener('DOMContentLoaded', () => {

    // --- Global Elements ---
    const overlay = document.getElementById('modalOverlay');
    const orderModal = document.getElementById('orderModal');
    const modalTitle = document.getElementById('modalTitle');
    const quantityToast = document.getElementById('quantityToast');
    const toastMessage = document.getElementById('toastMessage');
    const appContainer = document.querySelector('.app-container');
    const appHeader = document.querySelector('.app-header');
    const preloader = document.getElementById('preloader');
    let currentProduct = null; // To store product info for potential actions
    let currentModalStep = 0;
    const modalSteps = orderModal?.querySelectorAll('.modal-step');

    // --- Preloader ---
    window.addEventListener('load', () => {
        if (preloader) {
            preloader.classList.add('loaded');
            // Trigger entry animations after preloader fades
            // (Could add a specific class to body or elements)
        }
    });

    // --- Sticky Header Shadow ---
    if (appContainer && appHeader) {
        appContainer.addEventListener('scroll', () => {
            if (appContainer.scrollTop > 10) {
                appHeader.classList.add('scrolled');
            } else {
                appHeader.classList.remove('scrolled');
            }
        });
    }

    // --- Smooth Scrolling for Internal Links ---
    const scrollLinks = document.querySelectorAll('.scroll-link');
    scrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#') && href.length > 1) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                const appContainer = document.querySelector('.app-container');

                if (targetElement && appContainer) {
                    const headerHeight = document.querySelector('.app-header')?.offsetHeight || 0;
                    const targetPosition = targetElement.offsetTop - headerHeight - 15; // Offset for header + padding

                    appContainer.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    // Optional: Update active state in footer nav
                    document.querySelectorAll('.footer-nav a').forEach(navLink => {
                        navLink.classList.remove('active');
                        if(navLink.getAttribute('href') === href) {
                            navLink.classList.add('active');
                        }
                    });
                }
            } else if (href === '#') {
                 e.preventDefault(); // Prevent jump for empty hrefs
                 appContainer?.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });

     // --- Update Footer Active Nav on Scroll --- (Throttled)
     let scrollTimeout;
     if(appContainer) {
         appContainer.addEventListener('scroll', () => {
             clearTimeout(scrollTimeout);
             scrollTimeout = setTimeout(() => {
                 let currentSection = '';
                 const sections = document.querySelectorAll('section[id]');
                 const scrollPos = appContainer.scrollTop;
                 const headerHeight = document.querySelector('.app-header')?.offsetHeight || 0;

                 sections.forEach(section => {
                     const sectionTop = section.offsetTop - headerHeight - 50; // Adjust offset
                     if (scrollPos >= sectionTop) {
                         currentSection = section.getAttribute('id');
                     }
                 });

                 document.querySelectorAll('.footer-nav a').forEach(link => {
                     link.classList.remove('active');
                     if (link.getAttribute('href') === `#${currentSection}`) {
                         link.classList.add('active');
                     }
                 });
                 // Handle hero section explicitly if scroll is near top
                 if (scrollPos < sections[0]?.offsetTop - headerHeight - 50) {
                      const homeLink = document.querySelector('.footer-nav a[href="#hero"]');
                      if (homeLink) homeLink.classList.add('active');
                 }

             }, 100); // Throttle scroll check
         });
     }

    // --- Modal Handling ---
    const openModalButtons = document.querySelectorAll('[data-modal-target]');
    const closeModalButtons = document.querySelectorAll('.close-modal-btn');

    openModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.dataset.modalTarget;
            if (modalId === 'orderModal' && orderModal) {
                const planName = button.dataset.planName;
                const isAiBuild = button.dataset.aiBuild === 'true';
                prepareOrderModal(orderModal, planName, isAiBuild);
                openModal(orderModal);
            } else if (modalId === 'quantityModal') {
                 // Handle direct product add click -> Show Toast Notification
                 currentProduct = button.dataset.product;
                 if (currentProduct) {
                    const itemName = currentProduct;
                     // Simulate adding 1 item to a conceptual "cart"
                     // In a real app, you'd update a cart state here.
                    const itemList = orderModal?.querySelector('.selected-items-list');
                    if (itemList) {
                         addItemToModalList(itemList, itemName, 1, true); // Add or update quantity
                         updateModalUI(orderModal); // Update price etc.
                    }
                    showToast(`${itemName} added to pack!`);
                 }
            }
            // else {
            //     const otherModal = document.getElementById(modalId);
            //     if(otherModal) openModal(otherModal);
            // }
        });
    });

    overlay?.addEventListener('click', () => {
        closeAllModals();
    });

    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) closeModal(modal);
        });
    });

    function openModal(modal) {
        if (!modal || !overlay) return;
        modal.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent body scroll when modal open
    }

    function closeModal(modal) {
        if (!modal || !overlay) return;
        modal.classList.remove('active');
        // Only remove overlay if no other modals are active (future proofing)
        if (!document.querySelector('.modal.active')) {
            overlay.classList.remove('active');
            document.body.style.overflow = ''; // Restore body scroll
        }
        currentProduct = null;
        // Reset modal to first step when closing
        resetModalSteps();
    }

    function closeAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            closeModal(modal);
        });
    }

    // --- Toast Notification ---
    let toastTimeout;
    function showToast(message) {
        if (!quantityToast || !toastMessage) return;

        toastMessage.textContent = message;
        quantityToast.classList.add('show');

        clearTimeout(toastTimeout); // Clear previous timeout if any
        toastTimeout = setTimeout(() => {
            quantityToast.classList.remove('show');
        }, 2500); // Show for 2.5 seconds
    }


    // --- Order Modal Logic ---

    // Reset and Populate Order Modal
    function prepareOrderModal(modal, planName, isAiBuild) {
        const itemList = modal.querySelector('.selected-items-list');
        if (!itemList || !modalTitle) return;

        // Reset: Clear items, set default title, go to step 1
        itemList.innerHTML = ''; // Clear previous items
        modalTitle.textContent = 'Build Your Pack'; // Default
        resetModalSteps();
        showModalStep(0); // Show first step

        let packItems = []; // Array to hold [{ name: 'Milk', quantity: 1 }, ...]

        if (planName) {
            modalTitle.textContent = `Customize ${planName.replace(' Monthly', '')}`; // Clean title
            // Define items based on plan
            if (planName.includes('Basic Pack')) packItems = [{name: 'Milk', quantity: 1}, {name: 'Eggs', quantity: 1}, {name: 'Bread', quantity: 1}];
            else if (planName.includes('Family Pack')) packItems = [{name: 'Milk', quantity: 2}, {name: 'Eggs', quantity: 2}, {name: 'Bread', quantity: 1}, {name: 'Butter', quantity: 1}, {name: 'Cottage Cheese', quantity: 1}];
            else if (planName.includes('Smart AI Pack')) {
                modalTitle.textContent = `Your Smart AI Pack`;
                packItems = [{name: 'Milk', quantity: 1}, {name: 'Yogurt (AI)', quantity: 1}, {name: 'Eggs', quantity: 1}]; // AI simulation
            } else if (planName === 'Custom Pack') {
                modalTitle.textContent = `Build Your Custom Pack`;
                // Start empty or with a suggestion
                 packItems = []; // Start empty for custom
                 itemList.innerHTML = '<p class="empty-pack-message">Start by adding your favorite essentials!</p>';
            }
        } else if (isAiBuild) {
            modalTitle.textContent = `Your AI Generated Pack`;
            // Simulate AI generation
            packItems = [{name: 'Milk', quantity: 1}, {name: 'Eggs', quantity: 1}, {name: 'Butter (AI)', quantity: 1}, {name: 'Water', quantity: 1}];
            itemList.innerHTML += '<p style="font-size:0.8em; color: var(--primary-green); text-align: center; margin-top: -10px;">✨ AI built this pack based on typical needs!</p>';
        }

        // Add collected items to the list
        packItems.forEach(item => {
            addItemToModalList(itemList, item.name, item.quantity);
        });

        updateModalUI(modal); // Update counts, price, button states etc.
    }

    // Add/Update item in the modal list
    function addItemToModalList(listElement, itemName, quantity = 1, updateExisting = false) {
        if (!listElement) return;
        const existingItemLi = listElement.querySelector(`li[data-item="${itemName}"]`);

        // Remove empty message if present
        const emptyMsg = listElement.querySelector('.empty-pack-message');
        if(emptyMsg) emptyMsg.remove();

        if (existingItemLi && updateExisting) {
            // Update quantity of existing item
            const quantityInput = existingItemLi.querySelector('.item-quantity');
            if (quantityInput) {
                quantityInput.value = parseInt(quantityInput.value) + quantity;
                 // Trigger short animation/highlight
                 existingItemLi.style.animation = 'highlightItem 0.5s ease';
                 setTimeout(() => { existingItemLi.style.animation = ''; }, 500);
            }
        } else if (!existingItemLi) {
             // Add new item
             const li = document.createElement('li');
             li.dataset.item = itemName;
             li.innerHTML = `
                <span class="item-name">${itemName}</span>
                <div class="item-controls">
                    <input type="number" value="${quantity}" min="1" max="99" class="item-quantity" aria-label="${itemName} quantity">
                    <button class="remove-item" aria-label="Remove ${itemName}">&times;</button>
                </div>
            `;
            listElement.appendChild(li);
        }
        // If adding multiple items without update flag, just add them
        else if (!updateExisting) {
             const li = document.createElement('li');
             li.dataset.item = itemName; // May result in duplicates if called incorrectly
             li.innerHTML = `...`; // Same innerHTML as above
             listElement.appendChild(li);
        }
    }
    // CSS for highlight animation
    const styleSheet = document.styleSheets[0];
    try {
        styleSheet.insertRule(`
            @keyframes highlightItem {
                0%, 100% { background-color: transparent; }
                50% { background-color: var(--butter-yellow); }
            }
        `, styleSheet.cssRules.length);
    } catch(e) { console.warn("Could not insert CSS rule:", e); }


    // Use Event Delegation for dynamic items in modal list
    const selectedItemsList = orderModal?.querySelector('.selected-items-list');
    if (selectedItemsList) {
        selectedItemsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item')) {
                e.target.closest('li')?.remove();
                updateModalUI(orderModal);
            }
        });

        selectedItemsList.addEventListener('change', (e) => {
            if (e.target.classList.contains('item-quantity')) {
                // Ensure quantity is at least 1
                if (parseInt(e.target.value) < 1) {
                    e.target.value = 1;
                }
                 updateModalUI(orderModal);
            }
        });
         selectedItemsList.addEventListener('input', (e) => { // Handle direct input changes too
            if (e.target.classList.contains('item-quantity')) {
                 updateModalUI(orderModal); // Update price dynamically
            }
        });
    }


    // Update Price, Counts, Button States in Modal
    function updateModalUI(modal) {
        if (!modal) return;
        const itemList = modal.querySelector('.selected-items-list');
        const items = itemList.querySelectorAll('li');
        const totalPriceEl = modal.querySelector('.total-price');
        const summaryItemsCountEl = modal.querySelector('#summaryItemsCount');
        const nextStepBtnStep1 = modal.querySelector('.pack-builder .next-step-btn');
        const emptyMsg = modal.querySelector('.empty-pack-message');

        let total = 0;
        const priceMap = { // Keep this updated!
            "Milk": 3.50, "Eggs": 4.00, "Bread": 2.80, "Butter": 5.00,
            "Cottage Cheese": 4.50, "Sour Cream": 2.50, "Water": 1.50,
            "Yogurt (AI)": 3.00, "Butter (AI)": 5.00
        };

        items.forEach(li => {
            const itemName = li.dataset.item;
            const quantityInput = li.querySelector('.item-quantity');
            const quantity = quantityInput ? parseInt(quantityInput.value) || 0 : 1;
            total += (priceMap[itemName] || 0) * quantity;
        });

        // Update Total Price display
        if (totalPriceEl) {
            totalPriceEl.textContent = `$${total.toFixed(2)}`;
        }

        // Update Item Count in Summary
        if (summaryItemsCountEl) {
            summaryItemsCountEl.textContent = items.length;
        }

        // Enable/Disable Next button in Step 1 based on items
        if (nextStepBtnStep1) {
            nextStepBtnStep1.disabled = items.length === 0;
        }

        // Show/Hide empty message
         if (items.length === 0 && itemList && !emptyMsg) {
            itemList.innerHTML = '<p class="empty-pack-message">Your pack is empty. Add items below!</p>';
        } else if (items.length > 0 && emptyMsg) {
            emptyMsg.remove();
        }


        // --- Also Update dynamic info for Step 2 & 3 ---
        const frequencySelect = modal.querySelector('#deliveryFrequency');
        const summaryFrequencyEl = modal.querySelector('#summaryFrequency');
        const priceFrequencyText = modal.querySelector('.price-frequency');
        const firstDeliveryDateEl = modal.querySelector('#firstDeliveryDate');
        const summaryNextDeliveryEl = modal.querySelector('#summaryNextDelivery');

        if (frequencySelect && summaryFrequencyEl && priceFrequencyText) {
             const selectedFrequency = frequencySelect.options[frequencySelect.selectedIndex].text;
             const frequencyValue = frequencySelect.value; // weekly, monthly, etc.
             summaryFrequencyEl.textContent = selectedFrequency;

             // Update price frequency text
             if (frequencyValue === 'monthly') priceFrequencyText.textContent = '/ month';
             else if (frequencyValue === 'bi-weekly') priceFrequencyText.textContent = '/ 2 weeks';
             else priceFrequencyText.textContent = '/ week';

             // Rough next delivery date calculation (replace with sophisticated logic)
             const today = new Date();
             let nextDelivery = new Date(today);
             // Assuming next delivery is typically 2-3 days out for weekly
             if (frequencyValue === 'weekly') nextDelivery.setDate(today.getDate() + ( (5 - today.getDay() + 7) % 7 || 7) + 2 ); // Next Friday + 2 days buffer?
             else if (frequencyValue === 'bi-weekly') nextDelivery.setDate(today.getDate() + 14);
             else if (frequencyValue === 'monthly') nextDelivery.setMonth(today.getMonth() + 1);

             const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
             const formattedDate = nextDelivery.toLocaleDateString('en-US', dateOptions);

             if(firstDeliveryDateEl) firstDeliveryDateEl.textContent = formattedDate;
             if(summaryNextDeliveryEl) summaryNextDeliveryEl.textContent = formattedDate;
        }

    }

    // Recalculate price/date when frequency changes
     const frequencySelect = orderModal?.querySelector('#deliveryFrequency');
     if(frequencySelect) {
         frequencySelect.addEventListener('change', () => updateModalUI(orderModal));
     }

    // Modal Step Navigation
    if (orderModal && modalSteps?.length > 0) {
         orderModal.addEventListener('click', (e) => {
             if (e.target.classList.contains('next-step-btn')) {
                 if (currentModalStep < modalSteps.length - 1) {
                     currentModalStep++;
                     showModalStep(currentModalStep);
                 }
             } else if (e.target.classList.contains('prev-step-btn')) {
                 if (currentModalStep > 0) {
                     currentModalStep--;
                     showModalStep(currentModalStep);
                 }
             } else if (e.target.classList.contains('checkout-btn')) {
                 // Handle final checkout action
                 console.log("Subscription Confirmed (Simulation)");
                 closeModal(orderModal);
                 showToast("🎉 Subscription Confirmed! Welcome to Allin Order!");
                 // Potentially redirect or show success message on page
             }
         });
    }

    function showModalStep(stepIndex) {
         modalSteps?.forEach((step, index) => {
             if (index === stepIndex) {
                 step.classList.add('active-step');
             } else {
                 step.classList.remove('active-step');
             }
         });
         // Update modal title based on step? (Optional)
         // if (modalTitle) {
         //     if(stepIndex === 0) modalTitle.textContent = "Build Your Pack";
         //     else if (stepIndex === 1) modalTitle.textContent = "Delivery Details";
         //     else if (stepIndex === 2) modalTitle.textContent = "Confirm Order";
         // }
    }

    function resetModalSteps() {
         currentModalStep = 0;
         modalSteps?.forEach((step, index) => {
            step.classList.remove('active-step');
         });
         // Ensure first step is shown by default after reset if modal is opened again
         if (modalSteps?.[0]) modalSteps[0].classList.add('active-step');
    }


    // --- Plans Toggle ---
    const toggleContainer = document.querySelector('.toggle-switch');
    const toggleButtons = toggleContainer?.querySelectorAll('.toggle-btn');
    const toggleIndicator = toggleContainer?.querySelector('.toggle-indicator');
    const planCardsContainer = document.querySelector('.plan-cards-container');

    if (toggleContainer && toggleButtons?.length > 0 && toggleIndicator && planCardsContainer) {
        toggleButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                // Update active button state
                toggleButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Move indicator
                const buttonWidth = button.offsetWidth;
                const indicatorOffset = button.offsetLeft - toggleContainer.offsetLeft - 5; // Adjust for padding
                toggleIndicator.style.width = `${button.offsetWidth}px`;
                toggleIndicator.style.transform = `translateX(${button.offsetLeft - toggleContainer.offsetLeft}px)`;


                const planType = button.dataset.plan; // 'weekly', 'monthly', 'custom'

                // Show/hide plan cards with animation
                planCardsContainer.querySelectorAll('.plan-card').forEach(card => {
                    const cardIsTargetPlan = card.classList.contains(`${planType}-plan`);
                    if (cardIsTargetPlan) {
                        card.style.display = 'block'; // Or 'grid' etc.
                        // Trigger animation if needed (simple fade in)
                        card.style.animation = 'fadeInPlan 0.3s ease forwards';
                    } else {
                        // card.style.display = 'none';
                         // Fade out before hiding
                        card.style.animation = 'fadeOutPlan 0.3s ease forwards';
                        setTimeout(() => {
                             if (!card.classList.contains(`${planType}-plan`)) { // Double check it wasn't selected again quickly
                                card.style.display = 'none';
                             }
                        }, 300);
                    }
                });
            });
        });

         // Initialize indicator position
         const activeButton = toggleContainer.querySelector('.toggle-btn.active');
         if(activeButton) {
              toggleIndicator.style.width = `${activeButton.offsetWidth}px`;
              toggleIndicator.style.transform = `translateX(${activeButton.offsetLeft - toggleContainer.offsetLeft}px)`;
         }
    }
    // Add keyframes for plan fade in/out
    try {
        styleSheet.insertRule(`@keyframes fadeInPlan { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`, styleSheet.cssRules.length);
        styleSheet.insertRule(`@keyframes fadeOutPlan { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }`, styleSheet.cssRules.length);
    } catch(e) { console.warn("Could not insert CSS rule:", e); }



    // --- AI Text Cycling ---
    const aiTextElement = document.querySelector('.auto-text-cycle p');
    const aiPhrases = [
        "Add yogurt? Records show you like it.",
        "Low on cheese? Let's refill.",
        "Milk supply check: Running low?",
        "Organic eggs needed soon?",
        "Weekend bread stock? Sorted.",
        "Fresh butter makes everything better."
    ];
    let phraseIndex = 0;
    if (aiTextElement) {
        aiTextElement.textContent = aiPhrases[0]; // Initial text
        setInterval(() => {
            aiTextElement.style.opacity = 0;
             setTimeout(() => {
                 phraseIndex = (phraseIndex + 1) % aiPhrases.length;
                 aiTextElement.textContent = aiPhrases[phraseIndex];
                 aiTextElement.style.opacity = 1;
            }, 300); // Match CSS transition speed
        }, 4500); // Change every 4.5 seconds
    }


    // --- Scroll Reveal Animation (using Intersection Observer) ---
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    if (revealElements.length > 0 && typeof IntersectionObserver !== 'undefined') {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Get delay from data attribute or default to 0
                    const delay = entry.target.dataset.revealDelay || '0';
                    entry.target.style.transitionDelay = `${delay}ms`; // Apply delay from CSS variable if needed
                    entry.target.classList.add('visible');
                    // Optional: Stop observing once revealed for performance
                     observer.unobserve(entry.target);
                }
                // Optional: Reset if scrolling up (remove 'visible' class)
                // else {
                //     entry.target.classList.remove('visible');
                // }
            });
        }, {
             root: appContainer, // Observe scrolling within the app container
             rootMargin: '0px 0px -50px 0px', // Trigger slightly before element is fully in view from bottom
            threshold: 0.1
        });

        revealElements.forEach(el => {
            revealObserver.observe(el);
        });
    } else {
         // Fallback for browsers without Intersection Observer (or if elements not found)
         // Simply make them visible immediately or use a simpler scroll listener (less performant)
         revealElements.forEach(el => el.style.opacity = 1);
         console.warn("Intersection Observer not supported or no elements found for scroll reveal.");
    }


     // --- Footer Language Toggle --- (Basic console log)
     const langToggle = document.querySelector('.language-toggle');
     if(langToggle) {
         langToggle.addEventListener('click', (e) => {
             if(e.target.classList.contains('lang-btn') && !e.target.classList.contains('active')) {
                 langToggle.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
                 e.target.classList.add('active');
                 console.log(`Language set to: ${e.target.textContent}`);
                 // Add actual language switching logic here
             }
         });
     }

     // Placeholder for checkout confirmation
     // The actual logic is within the modal step navigation click listener

}); // End DOMContentLoaded