(function () {
    'use strict';

    /* ==========================================================================
       1. EventBus
       ========================================================================== */
    class EventBus {
        constructor() {
            this.listeners = {};
        }

        on(event, callback) {
            if (!this.listeners[event]) {
                this.listeners[event] = [];
            }
            this.listeners[event].push(callback);
        }

        off(event, callback) {
            if (!this.listeners[event]) return;
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }

        emit(event, data) {
            if (!this.listeners[event]) return;
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    const globalBus = new EventBus();

    /* ==========================================================================
       2. GameState
       ========================================================================== */
    class GameState {
        constructor() {
            this.reset();
        }

        reset() {
            this.attributes = {
                happiness: 10,
                financial: 10,
                health: 10
            };

            this.currentAge = 18;
            this.ageIndex = 0;
            this.isAlive = true;
            this.won = false;
            this.deathInfo = null;

            this.protections = {
                motorInsurance: 'none',          // 'none', 'third_party', 'comprehensive', 'comprehensive_pa'
                dentalCoverage: false,
                emergencyFund: 'none',           // 'none', 'limited', 'strong'
                homeInsurance: 'none',           // 'none', 'without_flood', 'with_flood'
                medicalCoverage: 'none',         // 'none', 'basic', 'high'
                criticalIllnessCoverage: false,
                disabilityIncomeProtection: false,
                personalAccidentCoverage: false,
                lifeInsurance: 'none'            // 'none', 'insufficient', 'adequate'
            };

            this.choiceHistory = [];
            this.eventHistory = [];

            globalBus.emit('state:updated', this.getSnapshot());
        }

        getSnapshot() {
            return {
                attributes: { ...this.attributes },
                currentAge: this.currentAge,
                isAlive: this.isAlive,
                won: this.won,
                protections: { ...this.protections },
                deathInfo: this.deathInfo ? { ...this.deathInfo } : null
            };
        }

        applyDelta(delta, sourceName = 'Life Event', customDeathQuote = null) {
            if (!this.isAlive) return false;

            const deltas = {
                happiness: delta.happiness || 0,
                financial: delta.financial || 0,
                health: delta.health || 0
            };

            this.attributes.happiness += deltas.happiness;
            this.attributes.financial += deltas.financial;
            this.attributes.health += deltas.health;

            globalBus.emit('attributes:changed', {
                deltas,
                current: { ...this.attributes },
                source: sourceName
            });

            this.checkGameOver(sourceName, customDeathQuote);
            globalBus.emit('state:updated', this.getSnapshot());
            return this.isAlive;
        }

        addProtection(key, value) {
            this.protections[key] = value;
            globalBus.emit('protection:added', { key, value });
        }

        checkGameOver(sourceName, customDeathQuote) {
            const { happiness, financial, health } = this.attributes;

            if (happiness <= 0) {
                this.triggerGameOver('happiness', 'Remember to be happy', sourceName);
            } else if (health <= 0) {
                this.triggerGameOver('health', "Wealth can't buy health", sourceName);
            } else if (financial <= 0) {
                const defaultFinQuote = `Bankrupt at age ${this.currentAge}! Your financial safety net has collapsed.`;
                const msg = customDeathQuote || this.getContextualFinancialQuote(sourceName) || defaultFinQuote;
                this.triggerGameOver('financial', msg, sourceName);
            }
        }

        getContextualFinancialQuote(sourceName) {
            const age = this.currentAge;
            if (age === 25 || sourceName.includes('Car')) {
                return "Guess you can't enjoy your car now.";
            }
            if (age === 18 || sourceName.includes('iPhone') || sourceName.includes('University')) {
                return "Wallet wiped out before leaving campus! Your youth ran out of funds.";
            }
            if (age === 28 || sourceName.includes('Wedding')) {
                return "Right after the lavish wedding, crushing debt tore daily life apart.";
            }
            if (age === 30 || sourceName.includes('House') || sourceName.includes('Home')) {
                return "Foreclosure notice arrived before you even broke in your new house keys.";
            }
            if (age === 38 || sourceName.includes('Business') || sourceName.includes('Startup')) {
                return "Startup capital burned to zero and partners vanished — bankruptcy!";
            }
            if (sourceName.includes('Accident')) {
                return "Massive repair bills and medical fines drained your bank account dry.";
            }
            if (sourceName.includes('Flood')) {
                return "Rising floodwaters washed away half a lifetime of savings and belongings.";
            }
            if (sourceName.includes('Surgery') || sourceName.includes('Illness') || sourceName.includes('Dental')) {
                return "Out-of-pocket emergency medical bills wiped out your last cent.";
            }
            return `At age ${age}, an unexpected crisis dragged your finances into the abyss!`;
        }

        triggerGameOver(attribute, message, sourceName) {
            this.isAlive = false;
            this.deathInfo = {
                attribute,
                message,
                eventName: sourceName,
                age: this.currentAge,
                finalStats: { ...this.attributes }
            };
            globalBus.emit('game:over', this.deathInfo);
        }

        triggerVictory() {
            this.won = true;
            globalBus.emit('game:won', {
                finalStats: { ...this.attributes },
                history: this.choiceHistory,
                protections: this.protections
            });
        }
    }

    /* ==========================================================================
       3. RulesEngine
       ========================================================================== */
    class RulesEngine {
        static generateWinEvaluation(gameState) {
            const { happiness, financial, health } = gameState.attributes;
            let narrative = [];

            narrative.push("After decades of highs and lows — school, career, marriage, homeownership, and raising a family — you have finally reached retirement at age 60. Every choice along the way shaped this one-of-a-kind life.");

            if (financial <= 3) {
                narrative.push("However, several unexpected shocks severely eroded your savings. Without comprehensive risk protection, you had to pay out of pocket every time disaster struck, leaving your retirement budget tight.");
            } else if (financial >= 7) {
                narrative.push("With forward-thinking risk protection and disciplined financial choices, you weathered every storm effortlessly. You built an unshakable financial fortress!");
            } else {
                narrative.push("Your financial standing remained steady overall. Despite a few bumps in the road, you avoided catastrophic losses and preserved enough cushion for a comfortable retirement.");
            }

            if (health <= 3) {
                narrative.push("Years of overwork and untreated strain caught up with you, leaving your golden years shadowed by health challenges. Even money cannot replace lost vitality.");
            } else if (happiness >= 7 && health >= 6) {
                narrative.push("You balanced inner joy, family warmth, and physical health while avoiding financial traps — a truly admirable, well-lived life!");
            } else if (happiness <= 3) {
                narrative.push("Although you survived financially, overly strict self-denial in your younger days cost you too many joyful memories. Remember: life is meant to be lived, not just calculated.");
            } else {
                narrative.push("You maintained solid physical and mental well-being, stepping peacefully into your golden years.");
            }

            return {
                summaryTable: [
                    { category: 'Happiness', score: `${Math.max(0, happiness)}/10` },
                    { category: 'Financial Security', score: `${Math.max(0, financial)}/10` },
                    { category: 'Health & Well-being', score: `${Math.max(0, health)}/10` }
                ],
                narrative: narrative.join("\n\n")
            };
        }
    }

    /* ==========================================================================
       4. DisasterEvents Data
       ========================================================================== */
    const DISASTER_EVENTS = [
        {
            id: 'minor_road_accident',
            title: '1. Minor Road Accident',
            rarity: 'Common',
            scenario: 'A morning commute fender-bender leaves your car needing RM3,000 in repairs.',
            animationClip: 'car_crash_minor',
            evaluateConsequence: (protections) => {
                if (protections.motorInsurance === 'comprehensive' || protections.motorInsurance === 'comprehensive_pa') {
                    return {
                        protectionUsed: 'Comprehensive Motor Insurance',
                        consequence: { happiness: 0, financial: 0, health: 0 },
                        narrative: 'Your insurer covers the full RM3,000 repair bill — your wallet takes zero damage!'
                    };
                } else if (protections.motorInsurance === 'third_party') {
                    return {
                        protectionUsed: 'Third-Party Insurance Only',
                        consequence: { happiness: -1, financial: -2, health: 0 },
                        narrative: 'Third-party coverage pays the other driver, leaving your own bodywork repair out of pocket.'
                    };
                } else {
                    return {
                        protectionUsed: 'No Valid Insurance',
                        consequence: { happiness: -2, financial: -3, health: -1 },
                        narrative: 'With zero coverage, you pay for both cars plus heavy fines and stress!'
                    };
                }
            }
        },
        {
            id: 'unexpected_dental_treatment',
            title: '2. Unexpected Dental Treatment',
            rarity: 'Common',
            scenario: 'Sudden unbearable toothache requires an emergency root canal and crown costing RM2,000.',
            animationClip: 'toothache_cry',
            evaluateConsequence: (protections) => {
                if (protections.dentalCoverage) {
                    return {
                        protectionUsed: 'Dental Coverage',
                        consequence: { happiness: 0, financial: 0, health: 0 },
                        narrative: 'Your dental plan pays the entire clinic bill! Your jaw aches, but your savings are safe.'
                    };
                } else {
                    return {
                        protectionUsed: 'No Dental Coverage',
                        consequence: { happiness: -1, financial: -1, health: -1 },
                        narrative: 'You swipe your card for the RM2,000 emergency bill, learning the hard way how pricey dental care is.'
                    };
                }
            }
        },
        {
            id: 'temporary_job_interruption',
            title: '3. Temporary Job Interruption',
            rarity: 'Common',
            scenario: 'Your industry hits a downturn and your employer delays salaries for two full months.',
            animationClip: 'broke_worry',
            evaluateConsequence: (protections) => {
                if (protections.emergencyFund === 'strong') {
                    return {
                        protectionUsed: 'Strong 6-Month Emergency Fund',
                        consequence: { happiness: 0, financial: 0, health: 0 },
                        narrative: 'Your 6-month emergency reserve covers rent and bills smoothly with zero panic.'
                    };
                } else if (protections.emergencyFund === 'limited') {
                    return {
                        protectionUsed: 'Limited Savings',
                        consequence: { happiness: -1, financial: -2, health: 0 },
                        narrative: 'Thin savings drain rapidly as you scrape by and delay bills through two anxious months.'
                    };
                } else {
                    return {
                        protectionUsed: 'No Emergency Savings',
                        consequence: { happiness: -2, financial: -3, health: -1 },
                        narrative: 'With zero buffer, rent and credit card collectors hit immediately, throwing life into chaos.'
                    };
                }
            }
        },
        {
            id: 'major_road_accident',
            title: '4. Major Road Accident',
            rarity: 'Rare',
            scenario: 'A highway pile-up totals your car (RM30,000 loss) and leaves you injured.',
            animationClip: 'car_crash_major',
            evaluateConsequence: (protections) => {
                if (protections.motorInsurance === 'comprehensive_pa' || (protections.motorInsurance === 'comprehensive' && protections.personalAccidentCoverage)) {
                    return {
                        protectionUsed: 'Comprehensive + Personal Accident',
                        consequence: { happiness: -1, financial: 0, health: 0 },
                        narrative: 'Car loss is reimbursed and medical recovery costs are covered by personal accident benefits.'
                    };
                } else if (protections.motorInsurance === 'comprehensive') {
                    return {
                        protectionUsed: 'Comprehensive Motor Only',
                        consequence: { happiness: -1, financial: -1, health: -1 },
                        narrative: 'Your car damage is covered, but physiotherapy and outpatient bills come out of your pocket.'
                    };
                } else {
                    return {
                        protectionUsed: 'No Comprehensive Coverage',
                        consequence: { happiness: -2, financial: -3, health: -2 },
                        narrative: 'A devastating financial blow — RM30,000 in vehicle damage plus steep hospital bills!'
                    };
                }
            }
        },
        {
            id: 'house_flooding',
            title: '5. House Flooding',
            rarity: 'Rare',
            scenario: 'Flash floods submerge your ground floor, destroying RM40,000 worth of furniture and appliances.',
            animationClip: 'flood_drown',
            evaluateConsequence: (protections) => {
                if (protections.homeInsurance === 'with_flood') {
                    return {
                        protectionUsed: 'Home Insurance + Flood Rider',
                        consequence: { happiness: -1, financial: 0, health: 0 },
                        narrative: 'The adjuster approves the flood claim in full — your home is restored without draining savings!'
                    };
                } else if (protections.homeInsurance === 'without_flood') {
                    return {
                        protectionUsed: 'Basic Home Policy (Flood Excluded)',
                        consequence: { happiness: -2, financial: -3, health: 0 },
                        narrative: 'Flood damage is excluded from your basic policy. You pay RM40,000 out of pocket to rebuild.'
                    };
                } else {
                    return {
                        protectionUsed: 'No Home Insurance',
                        consequence: { happiness: -3, financial: -4, health: -1 },
                        narrative: 'Muddy floodwaters ruin everything you own with zero compensation.'
                    };
                }
            }
        },
        {
            id: 'emergency_surgery',
            title: '6. Emergency Surgery',
            rarity: 'Rare',
            scenario: 'Your spouse needs immediate emergency surgery with an estimated RM35,000 hospital bill.',
            animationClip: 'hospital_surgery',
            evaluateConsequence: (protections) => {
                if (protections.medicalCoverage === 'high') {
                    return {
                        protectionUsed: 'High Medical Coverage',
                        consequence: { happiness: -1, financial: 0, health: 0 },
                        narrative: 'Cashless medical card admission secures top specialists with zero out-of-pocket fees!'
                    };
                } else if (protections.medicalCoverage === 'basic') {
                    return {
                        protectionUsed: 'Basic Medical Coverage',
                        consequence: { happiness: -1, financial: -2, health: -1 },
                        narrative: 'Basic coverage helps, but annual sub-limits and co-pays still leave a hefty bill.'
                    };
                } else {
                    return {
                        protectionUsed: 'No Medical Insurance',
                        consequence: { happiness: -2, financial: -4, health: -2 },
                        narrative: 'The RM35,000 bill empties your savings overnight, forcing emergency loans from relatives.'
                    };
                }
            }
        },
        {
            id: 'critical_illness',
            title: '7. Critical Illness',
            rarity: 'Epic',
            scenario: 'Checkups reveal an early-stage critical illness requiring prolonged surgery and targeted therapy.',
            animationClip: 'hospital_bed',
            evaluateConsequence: (protections) => {
                if (protections.criticalIllnessCoverage && (protections.medicalCoverage === 'high' || protections.medicalCoverage === 'basic')) {
                    return {
                        protectionUsed: 'Critical Illness + Medical Plan',
                        consequence: { happiness: -1, financial: 0, health: -1 },
                        narrative: 'A lump-sum critical illness payout replaces lost wages while medical insurance covers treatment.'
                    };
                } else if (protections.medicalCoverage !== 'none') {
                    return {
                        protectionUsed: 'Medical Insurance Only',
                        consequence: { happiness: -2, financial: -2, health: -2 },
                        narrative: 'Hospital bills are covered, but lost income during recovery weighs heavily on household finances.'
                    };
                } else {
                    return {
                        protectionUsed: 'No Critical Illness or Medical Coverage',
                        consequence: { happiness: -3, financial: -4, health: -3 },
                        narrative: 'Sky-high therapy bills and lost income push your family into severe financial distress.'
                    };
                }
            }
        },
        {
            id: 'permanent_disability',
            title: '8. Permanent Disability',
            rarity: 'Epic',
            scenario: 'A severe accident causes permanent mobility loss, preventing you from returning to your career.',
            animationClip: 'wheelchair_sad',
            evaluateConsequence: (protections) => {
                if (protections.disabilityIncomeProtection) {
                    return {
                        protectionUsed: 'Disability + Income Protection',
                        consequence: { happiness: -2, financial: -1, health: -2 },
                        narrative: 'Monthly disability income payouts keep groceries, bills, and care expenses fully covered.'
                    };
                } else if (protections.personalAccidentCoverage) {
                    return {
                        protectionUsed: 'Basic Personal Accident',
                        consequence: { happiness: -3, financial: -3, health: -3 },
                        narrative: 'A modest one-time payout fades quickly under ongoing care costs, leaving the future uncertain.'
                    };
                } else {
                    return {
                        protectionUsed: 'No Relevant Coverage',
                        consequence: { happiness: -4, financial: -5, health: -3 },
                        narrative: 'Total loss of income alongside lifelong care bills places overwhelming strain on your family.'
                    };
                }
            }
        },
        {
            id: 'death_of_breadwinner',
            title: '9. Death of Main Breadwinner',
            rarity: 'Epic',
            scenario: 'An unexpected tragedy claims your partner, leaving the mortgage and family expenses on your shoulders.',
            animationClip: 'gravestone_mourn',
            evaluateConsequence: (protections) => {
                if (protections.lifeInsurance === 'adequate') {
                    return {
                        protectionUsed: 'Adequate Life Insurance',
                        consequence: { happiness: -3, financial: -1, health: -1 },
                        narrative: 'Though heartbreak lingers, the life insurance payout clears the mortgage and secures your child\'s future.'
                    };
                } else if (protections.lifeInsurance === 'insufficient') {
                    return {
                        protectionUsed: 'Insufficient Life Insurance',
                        consequence: { happiness: -4, financial: -3, health: -2 },
                        narrative: 'The small payout only covers immediate expenses, leaving single-parent finances strained.'
                    };
                } else {
                    return {
                        protectionUsed: 'No Life Insurance',
                        consequence: { happiness: -5, financial: -5, health: -2 },
                        narrative: 'Without life coverage, crushing mortgage debt and living costs push the household to the brink.'
                    };
                }
            }
        }
    ];

    /* ==========================================================================
       5. StoryMilestones (English Edition with Cutscene Reactions)
       ========================================================================== */
    const STORY_MILESTONES = [
        {
            age: 18,
            title: 'Age 18 · University Life Begins',
            scenario: 'Welcome to college! Your parents hand you RM5,000 as a starter allowance. How will you handle your first taste of independence?',
            animationClip: 'university_campus',
            options: [
                {
                    id: 'A',
                    label: 'Buy the latest flagship iPhone on the spot! Show it off in every lecture hall!',
                    consequence: { happiness: 3, financial: -2, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'show_off_phone',
                    memoryTitle: 'Spotlight in the Lecture Hall (Eating Plain Rice Later)',
                    memoryText: 'Everyone admired the shiny flagship phone — until your meal card dropped to RM12.'
                },
                {
                    id: 'B',
                    label: 'Pick a practical mid-range phone and put the remaining cash into savings.',
                    consequence: { happiness: 1, financial: 1, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'smart_save',
                    memoryTitle: 'Smart Choice & Growing Savings',
                    memoryText: 'Smooth everyday phone plus steady bank interest — true peace of mind.'
                },
                {
                    id: 'C',
                    label: 'Extreme frugality: keep your cracked old phone and lock every cent into emergency savings.',
                    consequence: { happiness: -1, financial: 3, health: 0 },
                    protectionGrant: { emergencyFund: 'limited' },
                    animationReaction: 'frugal_sad',
                    memoryTitle: 'Cracked Screen & Lonely Savings',
                    memoryText: 'Your savings grew, though skipping every campus hangout felt a little lonely.'
                },
                {
                    id: 'D',
                    label: 'Live life to the fullest! Road trip and music festival with campus friends!',
                    consequence: { happiness: 3, financial: -2, health: 1 },
                    protectionGrant: null,
                    animationReaction: 'party_dance',
                    memoryTitle: 'Starry Night Campfire & Music Festival',
                    memoryText: 'Empty wallet, unforgettable sunrise melodies under the stars.'
                }
            ]
        },
        {
            age: 23,
            title: 'Age 23 · First Full-Time Paycheck',
            scenario: 'Congrats on graduating! You landed your first full-time job paying RM3,000/month.',
            animationClip: 'first_job_desk',
            options: [
                {
                    id: 'A',
                    label: 'Live the glamorous city life! Fine sushi, rooftop cocktails, and tailored suits!',
                    consequence: { happiness: 3, financial: -3, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'cocktail_party',
                    memoryTitle: 'Neon Rooftop Nights & Credit Card Bills',
                    memoryText: 'High-end nights felt electric until payday vanished into credit card statements.'
                },
                {
                    id: 'B',
                    label: 'Auto-invest 20% of every paycheck into index funds and enjoy the rest guilt-free.',
                    consequence: { happiness: 1, financial: 2, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'satisfied_nod',
                    memoryTitle: 'Automated Wealth Snowball',
                    memoryText: 'Every 25th of the month, your investments quietly compound in the background.'
                },
                {
                    id: 'C',
                    label: 'Cut non-essentials ruthlessly until you build a rock-solid 6-month emergency fund.',
                    consequence: { happiness: -1, financial: 3, health: 0 },
                    protectionGrant: { emergencyFund: 'strong' },
                    animationReaction: 'iron_piggybank',
                    memoryTitle: 'The Iron 6-Month Emergency Vault',
                    memoryText: 'Homemade noodles at night, unbreakable financial security in the vault.'
                },
                {
                    id: 'D',
                    label: 'Lock in comprehensive medical coverage early so a hospital visit never wrecks you.',
                    consequence: { happiness: 1, financial: 1, health: 1 },
                    protectionGrant: { medicalCoverage: 'basic' },
                    animationReaction: 'shield_protect',
                    memoryTitle: 'Your First Protective Medical Shield',
                    memoryText: 'Signing your first medical policy brings real grown-up peace of mind.'
                }
            ]
        },
        {
            age: 25,
            title: 'Age 25 · Buying Your First Car',
            scenario: 'Two years into your career, commuting and networking make getting a car a major milestone.',
            animationClip: 'car_dealership',
            options: [
                {
                    id: 'A',
                    label: 'Buy a roaring turbo sports car with comprehensive insurance — turn heads everywhere!',
                    consequence: { happiness: 4, financial: -3, health: 0 },
                    protectionGrant: { motorInsurance: 'comprehensive' },
                    animationReaction: 'sports_car_flex',
                    memoryTitle: 'Turbo Thrills vs. Steep Car Payments',
                    memoryText: 'Pure adrenaline at every green light, paired with heavy fuel and loan bills.'
                },
                {
                    id: 'B',
                    label: 'Buy a reliable, fuel-efficient sedan with full comprehensive motor insurance.',
                    consequence: { happiness: 3, financial: -1, health: 0 },
                    protectionGrant: { motorInsurance: 'comprehensive' },
                    animationReaction: 'sedan_drive',
                    memoryTitle: 'Cozy Drive Through Rainy Nights',
                    memoryText: 'Warm cabin, steady handling, and complete peace of mind in any weather.'
                },
                {
                    id: 'C',
                    label: 'Score a cheap 10-year-old beater car with basic third-party insurance to save cash.',
                    consequence: { happiness: 1, financial: 2, health: 0 },
                    protectionGrant: { motorInsurance: 'third_party' },
                    animationReaction: 'clunker_rattle',
                    memoryTitle: 'Rattling Old Faithful & Extra Cash',
                    memoryText: 'Noisy engine, zero loan payments — practical survival at its finest.'
                },
                {
                    id: 'D',
                    label: 'Skip car debt entirely! Stick to packed subway commutes and stack fixed deposits.',
                    consequence: { happiness: -1, financial: 3, health: 0 },
                    protectionGrant: { motorInsurance: 'none' },
                    animationReaction: 'bus_hanging',
                    memoryTitle: 'Crowded Rush-Hour Subway Defense',
                    memoryText: 'Squished on the morning train while watching your bank balance climb.'
                }
            ]
        },
        {
            age: 28,
            title: 'Age 28 · Tying the Knot',
            scenario: 'You met the love of your life and decided to say "I do." How should you celebrate the wedding?',
            animationClip: 'wedding_altar',
            options: [
                {
                    id: 'A',
                    label: 'Throw a 5-star beachfront wedding of the century with drones and floral arches!',
                    consequence: { happiness: 4, financial: -3, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'wedding_extravagant',
                    memoryTitle: 'Grand Spotlight Vows & Sky-High Invoices',
                    memoryText: 'Golden confetti rained down on 500 guests — followed by three years of tight budgets.'
                },
                {
                    id: 'B',
                    label: 'Host an intimate sunset garden wedding with close friends, music, and desserts.',
                    consequence: { happiness: 3, financial: -1, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'wedding_warm',
                    memoryTitle: 'Garden Breeze & Heartfelt Vows',
                    memoryText: 'Golden sunset, close friends, warm laughter, and zero budget regret.'
                },
                {
                    id: 'C',
                    label: 'Sign the papers, share a cozy dinner with parents, and save the rest for a house.',
                    consequence: { happiness: 1, financial: 2, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'quiet_dinner',
                    memoryTitle: 'Marriage Certificate & Steaming Noodles',
                    memoryText: 'Simple noodles after city hall — building a fortress for your future home.'
                },
                {
                    id: 'D',
                    label: 'Keep the banquet tiny and spend the budget on a dream round-the-world honeymoon!',
                    consequence: { happiness: 3, financial: -2, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'honeymoon_flight',
                    memoryTitle: 'Hand in Hand Under Alpine Auroras',
                    memoryText: 'Trading banquet formalities for snowy peaks and Northern Lights.'
                }
            ]
        },
        {
            age: 30,
            title: 'Age 30 · Buying Your First Home',
            scenario: 'Time to put down roots and stop dealing with landlords. What kind of home will you choose?',
            animationClip: 'real_estate_agent',
            options: [
                {
                    id: 'A',
                    label: 'Max out your mortgage for a luxury riverview penthouse with top amenities!',
                    consequence: { happiness: 4, financial: -4, health: 0 },
                    protectionGrant: { homeInsurance: 'with_flood' },
                    animationReaction: 'mansion_keys',
                    memoryTitle: 'Skyline Views Under Heavy Mortgage Pressure',
                    memoryText: 'Stunning floor-to-ceiling views — and 30 years of razor-thin monthly cash flow.'
                },
                {
                    id: 'B',
                    label: 'Buy a cozy, well-located 3-bedroom home well within your dual-income comfort zone.',
                    consequence: { happiness: 3, financial: -2, health: 0 },
                    protectionGrant: { homeInsurance: 'with_flood' },
                    animationReaction: 'cozy_house',
                    memoryTitle: 'Warm Hearth & Blooming Balcony',
                    memoryText: 'Home-cooked meals and weekend furniture builds without mortgage stress.'
                },
                {
                    id: 'C',
                    label: 'Pick a compact starter condo in the suburbs and keep plenty of liquid cash on hand.',
                    consequence: { happiness: 1, financial: 2, health: 0 },
                    protectionGrant: { homeInsurance: 'without_flood' },
                    animationReaction: 'small_apartment',
                    memoryTitle: 'Small Condo, Big Peace of Mind',
                    memoryText: 'Cozy living space paired with generous emergency cash in the bank.'
                },
                {
                    id: 'D',
                    label: 'Keep renting flexibly and invest the entire down payment into a diversified portfolio.',
                    consequence: { happiness: -1, financial: 3, health: 0 },
                    protectionGrant: { homeInsurance: 'none' },
                    animationReaction: 'stock_ticker',
                    memoryTitle: 'Renter Freedom & Growing Dividends',
                    memoryText: 'Occasional landlord hassles, offset by steady investment dividend checks.'
                }
            ]
        },
        {
            age: 33,
            title: 'Age 33 · Lifestyle Upgrade',
            scenario: 'Your career is soaring and household income just hit a new record. Time to decide how to reward yourselves!',
            animationClip: 'career_promotion',
            options: [
                {
                    id: 'A',
                    label: 'Refurnish the home with Italian designer sofas and an 85-inch laser home theater!',
                    consequence: { happiness: 4, financial: -3, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'luxury_couch',
                    memoryTitle: 'Laser Cinema & Sunk-Cost Sofas',
                    memoryText: 'Jaw-dropping movie nights for guests — though the novelty fades faster than the bill.'
                },
                {
                    id: 'B',
                    label: 'Upgrade to a luxury German executive SUV with Personal Accident protection included.',
                    consequence: { happiness: 3, financial: -3, health: 0 },
                    protectionGrant: { motorInsurance: 'comprehensive_pa' },
                    animationReaction: 'executive_suv',
                    memoryTitle: 'Executive SUV & Business Presence',
                    memoryText: 'Commanding road presence and safety coverage, plus steeper upkeep bills.'
                },
                {
                    id: 'C',
                    label: 'Book first-class tickets for the whole family to enjoy a sunny Mediterranean getaway!',
                    consequence: { happiness: 4, financial: -2, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'beach_sunglasses',
                    memoryTitle: 'Sunlit Family Portrait on the Coast',
                    memoryText: 'Watching parents and loved ones beam on golden beaches makes every cent worth it.'
                },
                {
                    id: 'D',
                    label: 'Resist lifestyle inflation! Keep habits simple and funnel raises into income assets.',
                    consequence: { happiness: -1, financial: 3, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'frugal_spreadsheet',
                    memoryTitle: '85% Towards Financial Freedom',
                    memoryText: 'Passing on flashy upgrades brings you dramatically closer to true independence.'
                }
            ]
        },
        {
            age: 35,
            title: 'Age 35 · Welcoming a New Life',
            scenario: 'Your baby\'s first cry fills the delivery room! Joy arrives alongside brand-new responsibilities.',
            animationClip: 'baby_cradle',
            options: [
                {
                    id: 'A',
                    label: 'Spare no expense! Imported organic formula, designer strollers, and private tutors!',
                    consequence: { happiness: 4, financial: -3, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'baby_spoiled',
                    memoryTitle: 'Luxury Nursery & Skyrocketing Baby Bills',
                    memoryText: 'A room overflowing with imported toys — and monthly receipts rivaling a new phone.'
                },
                {
                    id: 'B',
                    label: 'Open a dedicated compound university education trust fund starting from day one.',
                    consequence: { happiness: 2, financial: 2, health: 0 },
                    protectionGrant: { childEducationFund: true },
                    animationReaction: 'education_piggy',
                    memoryTitle: 'Planting the 18-Year Education Tree',
                    memoryText: 'Giving compounding time to grow your child\'s future university tuition.'
                },
                {
                    id: 'C',
                    label: 'Build a family fortress: high medical, life, critical illness, and dental coverage!',
                    consequence: { happiness: 1, financial: 2, health: 1 },
                    protectionGrant: {
                        medicalCoverage: 'high',
                        lifeInsurance: 'adequate',
                        criticalIllnessCoverage: true,
                        dentalCoverage: true
                    },
                    animationReaction: 'guardian_shield',
                    memoryTitle: 'Full-Family Protection Dome',
                    memoryText: 'Covering every member with rock-solid insurance lets you sleep soundly at night.'
                },
                {
                    id: 'D',
                    label: 'Balanced parenting: nature walks, smart budgeting, and basic medical & life cover.',
                    consequence: { happiness: 3, financial: 1, health: 1 },
                    protectionGrant: {
                        medicalCoverage: 'basic',
                        lifeInsurance: 'insufficient'
                    },
                    animationReaction: 'family_walk',
                    memoryTitle: 'Little Footprints in the Park',
                    memoryText: 'Chasing pigeons together in the park — presence beats pricey gadgets.'
                }
            ]
        },
        {
            age: 38,
            title: 'Age 38 · Startup Leap or Steady Ship?',
            scenario: 'At your career peak with rich experience and networks, the urge to launch your own venture burns bright.',
            animationClip: 'startup_office',
            options: [
                {
                    id: 'A',
                    label: 'Go all-in! Mortgage savings and take business loans to build a tech unicorn!',
                    consequence: { happiness: 4, financial: -4, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'rocket_launch',
                    memoryTitle: 'Startup Rocket & 3 AM Burn-Rate Anxiety',
                    memoryText: 'Grand pitches by day, sleepless cash-flow worries by night.'
                },
                {
                    id: 'B',
                    label: 'Launch a lean side-hustle consultancy after hours while keeping your day job.',
                    consequence: { happiness: 2, financial: -2, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'laptop_night',
                    memoryTitle: 'Desk-Lamp Hustle: Day Job + Side Biz',
                    memoryText: 'Testing entrepreneurial wings safely inside a low-risk sandbox.'
                },
                {
                    id: 'C',
                    label: 'Buy a stake in a proven, cash-flowing franchise store for steady quarterly dividends.',
                    consequence: { happiness: 1, financial: 2, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'franchise_deal',
                    memoryTitle: 'Franchise Partner · Quarterly Dividends',
                    memoryText: 'No unicorn hype — just reliable cash flow arriving every quarter.'
                },
                {
                    id: 'D',
                    label: 'Stay anchored in senior corporate leadership and stack blue-chip dividend stocks.',
                    consequence: { happiness: 1, financial: 3, health: 0 },
                    protectionGrant: { emergencyFund: 'strong' },
                    animationReaction: 'corporate_tie',
                    memoryTitle: 'Steady Captain on Solid Ground',
                    memoryText: 'While hype startups fold in downturns, your career and reserves stand firm.'
                }
            ]
        },
        {
            age: 45,
            title: 'Age 45 · Aging Parents Need Care',
            scenario: 'Seeing silver hair and slower steps on Mom and Dad reminds you it\'s your turn to protect them.',
            animationClip: 'elderly_parents',
            options: [
                {
                    id: 'A',
                    label: 'Buy Mom & Dad a luxury senior wellness villa with 24/7 private medical care!',
                    consequence: { happiness: 4, financial: -4, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'luxury_villa',
                    memoryTitle: 'Garden Wellness Villa for Mom & Dad',
                    memoryText: 'A major cash outlay, repaid instantly by your parents\' tearful smiles.'
                },
                {
                    id: 'B',
                    label: 'Send generous monthly allowances so they travel, dine out, and dance worry-free.',
                    consequence: { happiness: 3, financial: -2, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'red_envelope',
                    memoryTitle: 'Generous Monthly Allowances',
                    memoryText: 'Mom pretends it\'s too much, then proudly treats all her friends to tea.'
                },
                {
                    id: 'C',
                    label: 'Audit their chronic care needs and upgrade their high medical & critical illness shield.',
                    consequence: { happiness: 2, financial: 1, health: 0 },
                    protectionGrant: { medicalCoverage: 'high', criticalIllnessCoverage: true },
                    animationReaction: 'doctor_chart',
                    memoryTitle: 'Medical Chart Review & Healthcare Shield',
                    memoryText: 'Locking in hospital protection lifts their biggest fear of burdening you.'
                },
                {
                    id: 'D',
                    label: 'Spend two fixed days a week cooking for them, walking together, and attending checkups.',
                    consequence: { happiness: 3, financial: 0, health: 1 },
                    protectionGrant: null,
                    animationReaction: 'park_stroll',
                    memoryTitle: 'Golden Sunset Stroll Hand in Hand',
                    memoryText: 'You have become the sturdy oak tree sheltering them from life\'s storms.'
                }
            ]
        },
        {
            age: 52,
            title: 'Age 52 · Child\'s University Crossroads',
            scenario: 'Your child got accepted into an elite overseas university — with jaw-dropping tuition and living costs!',
            animationClip: 'graduation_letter',
            options: [
                {
                    id: 'A',
                    label: 'Cash out your retirement reserves to fully fund their overseas degree and flat!',
                    consequence: { happiness: 4, financial: -4, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'cash_fountain',
                    memoryTitle: 'Airport Departure & Halved Nest Egg',
                    memoryText: 'Proudly waving them off abroad, knowing your own retirement just got delayed.'
                },
                {
                    id: 'B',
                    label: 'Activate the education trust fund you started 17 years ago and top up mildly.',
                    consequence: { happiness: 3, financial: -2, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'bank_transfer',
                    memoryTitle: 'Harvesting 17 Years of Compounding',
                    memoryText: 'Your foresight decades ago funded their dream campus without hurting your future.'
                },
                {
                    id: 'C',
                    label: 'Coach your child to win merit scholarships and campus teaching assistantships.',
                    consequence: { happiness: 1, financial: 2, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'scholarship_scroll',
                    memoryTitle: 'Gold-Sealed Dean\'s Scholarship',
                    memoryText: 'Independence and resilience — the finest graduation gift you ever gave.'
                },
                {
                    id: 'D',
                    label: 'Guide them to a top domestic honor program at 1/10 the cost, keeping assets rock-solid.',
                    consequence: { happiness: 2, financial: 2, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'local_campus',
                    memoryTitle: 'Smart Local Honors Degree',
                    memoryText: 'World-class lab experience at home while preserving family financial strength.'
                }
            ]
        },
        {
            age: 55,
            title: 'Age 55 · Designing Your Retirement Horizon',
            scenario: 'Only a few years remain before formal retirement. How will you navigate the final stretch?',
            animationClip: 'sunset_horizon',
            options: [
                {
                    id: 'A',
                    label: 'Retire early right now! Hop on a luxury round-the-world cruise while you still can!',
                    consequence: { happiness: 5, financial: -4, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'cruise_ship',
                    memoryTitle: 'Champagne on the Ocean Cruise Deck',
                    memoryText: 'Goodbye spreadsheets, hello northern lights and pyramids — pricey but unforgettable.'
                },
                {
                    id: 'B',
                    label: 'Grind five more intense years of overtime to squeeze out max pension & bonuses.',
                    consequence: { happiness: -1, financial: 4, health: -1 },
                    protectionGrant: null,
                    animationReaction: 'exhausted_briefcase',
                    memoryTitle: 'Late-Night Overtime & Rising Blood Pressure',
                    memoryText: 'The bank balance climbed higher, while neck pain and exhaustion took their toll.'
                },
                {
                    id: 'C',
                    label: 'Transition smoothly on schedule into gardening, reading, tea, and calm slow living.',
                    consequence: { happiness: 2, financial: 2, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'gardening_smile',
                    memoryTitle: 'Morning Jasmine Tea & Quiet Books',
                    memoryText: 'Zero rush, inner peace, and steady finances — true richness.'
                },
                {
                    id: 'D',
                    label: 'One final gamble: throw half your retirement pot into high-leverage crypto trading!',
                    consequence: { happiness: 3, financial: -4, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'crypto_roulette',
                    memoryTitle: 'Heart-Stopping Red Crash Candles',
                    memoryText: 'Chasing 10x overnight riches ended in a brutal market wipeout.'
                }
            ]
        },
        {
            age: 60,
            title: 'Age 60 · The Golden Retirement Chapter',
            scenario: 'Sixty years wise and officially retired! Your children are independent and every hour is yours.',
            animationClip: 'age60_rocking_chair',
            options: [
                {
                    id: 'A',
                    label: 'Party to the finish line! First-class flights, Michelin feasts, and 5-star resorts!',
                    consequence: { happiness: 4, financial: -3, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'champagne_toast',
                    memoryTitle: 'Toasting a High-Rolling Retirement',
                    memoryText: 'Living every day like a grand celebration until the final tab arrives.'
                },
                {
                    id: 'B',
                    label: 'Buy a serene seaside timber cottage with a rocking chair overlooking the waves.',
                    consequence: { happiness: 4, financial: -4, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'cottage_view',
                    memoryTitle: 'Seaside Cottage & Ocean Breeze',
                    memoryText: 'Seagulls overhead and ocean waves singing outside your porch every morning.'
                },
                {
                    id: 'C',
                    label: 'Keep healthy routines, guard your cash buffer, and protect your medical security.',
                    consequence: { happiness: 1, financial: 3, health: 0 },
                    protectionGrant: null,
                    animationReaction: 'peaceful_reading',
                    memoryTitle: 'Morning Tai Chi & Fortress Reserves',
                    memoryText: 'Steady health and deep reserves keep you calm through any storm.'
                },
                {
                    id: 'D',
                    label: 'Volunteer in the community, teach kids to read, and spoil your joyful grandkids!',
                    consequence: { happiness: 3, financial: 0, health: 2 },
                    protectionGrant: null,
                    animationReaction: 'taichi_grandkids',
                    memoryTitle: 'Grandkids, Cherry Blossoms & Warmth',
                    memoryText: 'Passing love and wisdom to the next generation — the richest ending of all.'
                }
            ]
        }
    ];

    /* ==========================================================================
       6. RandomEventManager (6 Random Non-Repeating Disasters at Any Age)
       ========================================================================== */
    class RandomEventManager {
        constructor(gameState) {
            this.gameState = gameState;
            this.scheduledEvents = new Map();
            this.usedEventIds = new Set();
            this.initSchedule();

            globalBus.on('game:restart', () => {
                this.initSchedule();
            });
        }

        initSchedule() {
            this.scheduledEvents.clear();
            this.usedEventIds.clear();

            const allAges = STORY_MILESTONES.map(m => m.age);

            const shuffle = (arr) => {
                const a = [...arr];
                for (let i = a.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [a[i], a[j]] = [a[j], a[i]];
                }
                return a;
            };

            // Exactly 6 out of 9 unexpected events chosen per game without repeating
            const chosenEvents = shuffle(DISASTER_EVENTS).slice(0, 6);

            // 6 milestone ages chosen randomly out of all 12 ages
            const chosenAges = shuffle(allAges).slice(0, 6);

            for (let i = 0; i < 6; i++) {
                this.scheduledEvents.set(chosenAges[i], chosenEvents[i]);
            }
        }

        checkForRandomEvent(currentAge) {
            if (this.scheduledEvents.has(currentAge)) {
                const eventData = this.scheduledEvents.get(currentAge);
                this.scheduledEvents.delete(currentAge);
                this.usedEventIds.add(eventData.id);
                return eventData;
            }
            return null;
        }

        evaluateEvent(eventData) {
            return eventData.evaluateConsequence(this.gameState.protections);
        }

        applyEventConsequence(eventData, evaluation) {
            globalBus.emit('disaster:occurred', {
                event: eventData,
                evaluation: evaluation
            });

            const alive = this.gameState.applyDelta(
                evaluation.consequence,
                eventData.title
            );

            return alive;
        }

        resolveEvent(eventData) {
            const evaluation = this.evaluateEvent(eventData);
            const alive = this.applyEventConsequence(eventData, evaluation);
            return { evaluation, alive };
        }
    }

    /* ==========================================================================
       7. Skeletal Animation System (Multi-Character Rig: Player, Dad, Mom, Friend)
       ========================================================================== */
    class Bone {
        constructor(name, length = 30, localAngle = 0, localX = 0, localY = 0) {
            this.name = name;
            this.length = length;
            this.localAngle = localAngle;
            this.localX = localX;
            this.localY = localY;

            this.parent = null;
            this.children = [];

            this.worldX = 0;
            this.worldY = 0;
            this.worldAngle = 0;
            this.worldEndX = 0;
            this.worldEndY = 0;

            this.thickness = 5;
            this.color = '#111111';
        }

        addChild(bone) {
            bone.parent = this;
            this.children.push(bone);
            return bone;
        }

        updateWorldTransform() {
            if (this.parent) {
                const cos = Math.cos(this.parent.worldAngle);
                const sin = Math.sin(this.parent.worldAngle);

                this.worldX = this.parent.worldX + (this.localX * cos - this.localY * sin);
                this.worldY = this.parent.worldY + (this.localX * sin + this.localY * cos);
                this.worldAngle = this.parent.worldAngle + this.localAngle;
            } else {
                this.worldX = this.localX;
                this.worldY = this.localY;
                this.worldAngle = this.localAngle;
            }

            this.worldEndX = this.worldX + Math.cos(this.worldAngle) * this.length;
            this.worldEndY = this.worldY + Math.sin(this.worldAngle) * this.length;

            for (const child of this.children) {
                child.updateWorldTransform();
            }
        }
    }

    class Skeleton {
        constructor(role = 'player') {
            this.role = role; // 'player', 'dad', 'mom', 'friend'
            this.bones = {};
            this.buildHierarchy();

            this.expression = {
                eyeType: 'normal',
                mouthType: 'smile',
                browType: 'normal',
                blush: false,
                tearDrop: false,
                headProp: null,
                handPropL: null,
                handPropR: null,
                extraEffect: null
            };

            // Unique Character Rig Props (Pure Skeletal Vector Accents)
            this.bikePhase = { dad: 0, player: 1.1, friend: 2.3, mom: 3.7, bride: 4.5 }[role] || 0;
            if (this.role === 'dad') {
                this.hasTopHat = true;
                this.hasMustache = true;
                this.hasBowtie = true;
                this.hasWalkingCane = true;
            } else if (this.role === 'mom') {
                this.hasRedHair = true;
                this.hasEyelashes = true;
                this.hasBlush = true;
            } else if (this.role === 'friend') {
                this.hasHeadphones = true;
            } else if (this.role === 'bride') {
                this.hasBridalHair = true;
                this.hasWeddingDress = true;
                this.hasBridalVeil = true;
                this.hasBouquet = true;
                this.hasEyelashes = true;
                this.hasBlush = true;
            }
        }

        buildHierarchy() {
            const root = new Bone('root', 0, 0, 0, 0);

            const pelvis = new Bone('pelvis', 15, -Math.PI / 2, 0, 0);
            root.addChild(pelvis);

            const spine = new Bone('spine', 45, 0, 15, 0);
            pelvis.addChild(spine);

            const neck = new Bone('neck', 10, 0, 45, 0);
            spine.addChild(neck);

            const head = new Bone('head', 26, 0, 10, 0);
            neck.addChild(head);

            // Left Arm
            const armL_Upper = new Bone('arm_l_upper', 30, Math.PI * 0.7, 40, 0);
            spine.addChild(armL_Upper);
            const armL_Lower = new Bone('arm_l_lower', 28, -Math.PI * 0.2, 30, 0);
            armL_Upper.addChild(armL_Lower);
            const handL = new Bone('hand_l', 10, 0, 28, 0);
            armL_Lower.addChild(handL);

            // Right Arm
            const armR_Upper = new Bone('arm_r_upper', 30, -Math.PI * 0.7, 40, 0);
            spine.addChild(armR_Upper);
            const armR_Lower = new Bone('arm_r_lower', 28, Math.PI * 0.2, 30, 0);
            armR_Upper.addChild(armR_Lower);
            const handR = new Bone('hand_r', 10, 0, 28, 0);
            armR_Lower.addChild(handR);

            // Left Leg
            const legL_Upper = new Bone('leg_l_upper', 36, Math.PI * 0.6, 0, -5);
            pelvis.addChild(legL_Upper);
            const legL_Lower = new Bone('leg_l_lower', 34, -Math.PI * 0.15, 36, 0);
            legL_Upper.addChild(legL_Lower);
            const footL = new Bone('foot_l', 12, Math.PI * 0.4, 34, 0);
            legL_Lower.addChild(footL);

            // Right Leg
            const legR_Upper = new Bone('leg_r_upper', 36, Math.PI * 0.4, 0, 5);
            pelvis.addChild(legR_Upper);
            const legR_Lower = new Bone('leg_r_lower', 34, Math.PI * 0.15, 36, 0);
            legR_Upper.addChild(legR_Lower);
            const footR = new Bone('foot_r', 12, Math.PI * 0.4, 34, 0);
            legR_Lower.addChild(footR);

            const list = [
                root, pelvis, spine, neck, head,
                armL_Upper, armL_Lower, handL,
                armR_Upper, armR_Lower, handR,
                legL_Upper, legL_Lower, footL,
                legR_Upper, legR_Lower, footR
            ];
            for (const b of list) {
                this.bones[b.name] = b;
            }

            this.root = root;
        }

        getBone(name) {
            return this.bones[name];
        }

        setPose(poseData) {
            for (const [name, angle] of Object.entries(poseData)) {
                if (this.bones[name]) {
                    this.bones[name].localAngle = angle;
                }
            }
        }

        update() {
            this.root.updateWorldTransform();
        }
    }

    class Character {
        constructor(role, x = 0, y = 0) {
            this.role = role;
            this.skeleton = new Skeleton(role);
            this.animController = new AnimationController(this.skeleton);
            this.visible = true;
            this.setPosition(x, y);
        }

        setPosition(x, y) {
            this.skeleton.root.localX = x;
            this.skeleton.root.localY = y;
        }

        update(deltaTime) {
            if (!this.visible) return;
            this.animController.update(deltaTime);
        }

        play(clipName, expression = null) {
            this.animController.play(clipName, expression);
        }
    }

    class AnimationController {
        constructor(skeleton) {
            this.skeleton = skeleton;
            this.skeleton.animController = this;
            this.currentClip = 'idle';
            this.time = 0;
            this.initClips();
        }

        solveTwoBoneIK(sx, sy, tx, ty, L1, L2, bendDir = 1) {
            const dx = tx - sx;
            const dy = ty - sy;
            const d = Math.min(L1 + L2 - 0.01, Math.max(Math.abs(L1 - L2) + 0.01, Math.hypot(dx, dy)));
            const phi = Math.atan2(dy, dx);
            const cosA = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
            const cosB = Math.max(-1, Math.min(1, (L2 * L2 + d * d - L1 * L1) / (2 * L2 * d)));
            const alpha = Math.acos(cosA);
            const beta = Math.acos(cosB);
            return {
                world1: phi + bendDir * alpha,
                local2: -bendDir * (alpha + beta)
            };
        }

        computeBikePose(t) {
            const pedal = t * 6 + (this.skeleton.bikePhase || 0);
            const bounce = Math.sin(pedal * 2) * 1.2;
            const pelvisX = -15;
            const pelvisY = -72 + bounce;
            const pelvisA = -Math.PI / 2 + 0.34;
            const spineA = 0.04;
            const trunkA = pelvisA + spineA;

            const spineBaseX = pelvisX + 15 * Math.cos(pelvisA);
            const spineBaseY = pelvisY + 15 * Math.sin(pelvisA);
            const shX = spineBaseX + 40 * Math.cos(trunkA);
            const shY = spineBaseY + 40 * Math.sin(trunkA);

            const armL = this.solveTwoBoneIK(shX, shY, 20, -83, 30, 28, 1);
            const armR = this.solveTwoBoneIK(shX, shY, 24, -81, 30, 28, 1);

            const hipLX = pelvisX - (-5) * Math.sin(pelvisA);
            const hipLY = pelvisY + (-5) * Math.cos(pelvisA);
            const hipRX = pelvisX - 5 * Math.sin(pelvisA);
            const hipRY = pelvisY + 5 * Math.cos(pelvisA);

            const pedLX = -2 + 11 * Math.cos(pedal + Math.PI);
            const pedLY = -25 + 11 * Math.sin(pedal + Math.PI);
            const pedRX = -2 + 11 * Math.cos(pedal);
            const pedRY = -25 + 11 * Math.sin(pedal);

            const legL = this.solveTwoBoneIK(hipLX, hipLY, pedLX, pedLY, 36, 34, -1);
            const legR = this.solveTwoBoneIK(hipRX, hipRY, pedRX, pedRY, 36, 34, -1);

            return {
                hipOffsetX: pelvisX,
                hipOffsetY: pelvisY,
                pelvis: pelvisA,
                spine: spineA,
                neck: -0.34,
                arm_l_upper: armL.world1 - trunkA,
                arm_l_lower: armL.local2,
                hand_l: -(armL.world1 + armL.local2) + 0.1,
                arm_r_upper: armR.world1 - trunkA,
                arm_r_lower: armR.local2,
                hand_r: -(armR.world1 + armR.local2) + 0.1,
                leg_l_upper: legL.world1 - pelvisA,
                leg_l_lower: legL.local2,
                foot_l: -(legL.world1 + legL.local2) - 0.08 * Math.cos(pedal + Math.PI),
                leg_r_upper: legR.world1 - pelvisA,
                leg_r_lower: legR.local2,
                foot_r: -(legR.world1 + legR.local2) - 0.08 * Math.cos(pedal)
            };
        }

        initClips() {
            this.clips = {
                idle: (t) => {
                    const breath = Math.sin(t * 2.5) * 0.04;
                    return {
                        hipOffsetY: -70,
                        pelvis: -Math.PI / 2 + breath * 0.25,
                        spine: breath,
                        neck: -breath * 0.5,
                        arm_l_upper: -Math.PI * 0.88 + Math.sin(t * 2.5) * 0.05,
                        arm_l_lower: -0.15 + Math.cos(t * 2.5) * 0.04,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.88 - Math.sin(t * 2.5) * 0.05,
                        arm_r_lower: 0.15 - Math.cos(t * 2.5) * 0.04,
                        hand_r: 0,
                        leg_l_upper: Math.PI + 0.14,
                        leg_l_lower: -0.10,
                        foot_l: Math.PI * 0.45,
                        leg_r_upper: Math.PI - 0.14,
                        leg_r_lower: 0.10,
                        foot_r: -Math.PI * 0.45
                    };
                },

                happy_dance: (t) => {
                    const jump = Math.abs(Math.sin(t * 6));
                    const wave = Math.sin(t * 8) * 0.25;
                    return {
                        hipOffsetY: -70 - jump * 18,
                        pelvis: -Math.PI / 2,
                        spine: wave * 0.15,
                        neck: -wave * 0.1,
                        arm_l_upper: -Math.PI * 0.30 + wave,
                        arm_l_lower: Math.PI * 0.22,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.30 - wave,
                        arm_r_lower: -Math.PI * 0.22,
                        hand_r: 0,
                        leg_l_upper: Math.PI + 0.22 + jump * 0.22,
                        leg_l_lower: -jump * 0.35,
                        foot_l: Math.PI * 0.45,
                        leg_r_upper: Math.PI - 0.22 - jump * 0.22,
                        leg_r_lower: jump * 0.35,
                        foot_r: -Math.PI * 0.45
                    };
                },

                shocked: (t) => {
                    const shudder = (Math.random() - 0.5) * 0.12;
                    return {
                        hipOffsetY: -66 + Math.abs(shudder) * 14,
                        pelvis: -Math.PI / 2,
                        spine: -0.08 + shudder,
                        neck: 0.08,
                        arm_l_upper: -Math.PI * 0.35,
                        arm_l_lower: Math.PI * 0.45,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.35,
                        arm_r_lower: -Math.PI * 0.45,
                        hand_r: 0,
                        leg_l_upper: Math.PI + 0.30,
                        leg_l_lower: -0.35,
                        foot_l: Math.PI * 0.45,
                        leg_r_upper: Math.PI - 0.30,
                        leg_r_lower: 0.35,
                        foot_r: -Math.PI * 0.45
                    };
                },

                crying_broke: (t) => {
                    const sob = Math.sin(t * 7) * 0.08;
                    return {
                        hipOffsetY: -36,
                        pelvis: -Math.PI * 0.46,
                        spine: 0.14 + sob,
                        neck: 0.32,
                        arm_l_upper: -Math.PI * 0.65,
                        arm_l_lower: Math.PI * 0.72 + sob,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.65,
                        arm_r_lower: -Math.PI * 0.72 - sob,
                        hand_r: 0,
                        leg_l_upper: Math.PI * 0.78,
                        leg_l_lower: Math.PI * 0.66,
                        foot_l: Math.PI * 0.25,
                        leg_r_upper: Math.PI * 0.84,
                        leg_r_lower: Math.PI * 0.59,
                        foot_r: Math.PI * 0.25
                    };
                },

                sports_car_flex: (t) => {
                    const rumble = Math.sin(t * 12) * 0.03;
                    return {
                        hipOffsetY: -42,
                        pelvis: -Math.PI * 0.54 + rumble,
                        spine: 0.08,
                        neck: 0.05,
                        arm_l_upper: Math.PI * 0.60,
                        arm_l_lower: -Math.PI * 0.20,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.70,
                        arm_r_lower: -Math.PI * 0.30,
                        hand_r: 0,
                        leg_l_upper: Math.PI * 0.62,
                        leg_l_lower: Math.PI * 0.38,
                        foot_l: -Math.PI * 0.45,
                        leg_r_upper: Math.PI * 0.68,
                        leg_r_lower: Math.PI * 0.32,
                        foot_r: -Math.PI * 0.45
                    };
                },

                cinema_sit: (t) => {
                    const chill = Math.sin(t * 2.2) * 0.025;
                    return {
                        hipOffsetY: -38,
                        pelvis: -Math.PI * 0.52 + chill * 0.4,
                        spine: -0.05,
                        neck: -0.14 + chill,
                        arm_l_upper: Math.PI * 0.78,
                        arm_l_lower: -Math.PI * 0.28,
                        hand_l: 0,
                        arm_r_upper: -Math.PI * 0.78,
                        arm_r_lower: Math.PI * 0.28,
                        hand_r: 0,
                        leg_l_upper: Math.PI * 0.64,
                        leg_l_lower: Math.PI * 0.36,
                        foot_l: -Math.PI * 0.45,
                        leg_r_upper: Math.PI * 0.56,
                        leg_r_lower: Math.PI * 0.44,
                        foot_r: -Math.PI * 0.45
                    };
                },

                hospital_bed: (t) => {
                    const weakBreath = Math.sin(t * 1.5) * 0.025;
                    return {
                        hipOffsetX: -10,
                        hipOffsetY: -75,
                        pelvis: 0,
                        spine: weakBreath,
                        neck: -0.08,
                        arm_l_upper: Math.PI * 0.15,
                        arm_l_lower: 0.12,
                        hand_l: 0,
                        arm_r_upper: -Math.PI * 0.15,
                        arm_r_lower: -0.12,
                        hand_r: 0,
                        leg_l_upper: Math.PI + 0.04,
                        leg_l_lower: -0.04,
                        foot_l: Math.PI * 0.45,
                        leg_r_upper: Math.PI - 0.06,
                        leg_r_lower: 0.06,
                        foot_r: Math.PI * 0.45
                    };
                },

                dead_flat: (t) => {
                    return {
                        hipOffsetX: -30,
                        hipOffsetY: -8,
                        pelvis: 0.02,
                        spine: 0.03,
                        neck: 0.05,
                        arm_l_upper: Math.PI * 0.35,
                        arm_l_lower: 0.25,
                        hand_l: 0,
                        arm_r_upper: -Math.PI * 0.35,
                        arm_r_lower: -0.25,
                        hand_r: 0,
                        leg_l_upper: Math.PI + 0.05,
                        leg_l_lower: -0.08,
                        foot_l: Math.PI * 0.45,
                        leg_r_upper: Math.PI - 0.08,
                        leg_r_lower: 0.12,
                        foot_r: Math.PI * 0.45
                    };
                },

                rich_swagger: (t) => {
                    const sway = Math.sin(t * 3.5) * 0.10;
                    return {
                        hipOffsetY: -69 + Math.abs(Math.sin(t * 3.5)) * 2,
                        pelvis: -Math.PI / 2 + sway * 0.35,
                        spine: -sway * 0.25,
                        neck: sway * 0.2,
                        arm_l_upper: -Math.PI * 0.72,
                        arm_l_lower: -Math.PI * 0.56,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.85 - sway,
                        arm_r_lower: 0.20,
                        hand_r: 0,
                        leg_l_upper: Math.PI + 0.15 + Math.cos(t * 3.5) * 0.12,
                        leg_l_lower: -0.10,
                        foot_l: Math.PI * 0.45,
                        leg_r_upper: Math.PI - 0.15 - Math.cos(t * 3.5) * 0.12,
                        leg_r_lower: 0.10,
                        foot_r: -Math.PI * 0.45
                    };
                },

                // DAD SPECIAL ANIMATIONS
                dad_rock_baby: (t) => {
                    const sway = Math.sin(t * 3) * 0.10;
                    return {
                        hipOffsetY: -70,
                        pelvis: -Math.PI / 2 + sway * 0.3,
                        spine: 0.06 + sway * 0.2,
                        neck: 0.08,
                        arm_l_upper: -Math.PI * 0.72,
                        arm_l_lower: -Math.PI * 0.35 + Math.sin(t * 3) * 0.12,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.72,
                        arm_r_lower: Math.PI * 0.35 - Math.sin(t * 3) * 0.12,
                        hand_r: 0,
                        leg_l_upper: Math.PI + 0.14,
                        leg_l_lower: -0.10,
                        foot_l: Math.PI * 0.45,
                        leg_r_upper: Math.PI - 0.14,
                        leg_r_lower: 0.10,
                        foot_r: -Math.PI * 0.45
                    };
                },

                dad_proud: (t) => {
                    const breath = Math.sin(t * 2) * 0.03;
                    return {
                        hipOffsetY: -70,
                        pelvis: -Math.PI / 2 + breath,
                        spine: -0.03,
                        neck: -0.02,
                        arm_l_upper: -Math.PI * 0.72,
                        arm_l_lower: -Math.PI * 0.56,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.78,
                        arm_r_lower: Math.PI * 0.22,
                        hand_r: 0,
                        leg_l_upper: Math.PI + 0.14,
                        leg_l_lower: -0.10,
                        foot_l: Math.PI * 0.45,
                        leg_r_upper: Math.PI - 0.14,
                        leg_r_lower: 0.10,
                        foot_r: -Math.PI * 0.45
                    };
                },

                // MOM SPECIAL ANIMATIONS
                mom_cradle: (t) => {
                    const sway = Math.sin(t * 2.5) * 0.08;
                    return {
                        hipOffsetY: -70,
                        pelvis: -Math.PI / 2 + sway * 0.25,
                        spine: sway * 0.15,
                        neck: 0.05,
                        arm_l_upper: -Math.PI * 0.74,
                        arm_l_lower: -Math.PI * 0.38,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.74,
                        arm_r_lower: Math.PI * 0.38,
                        hand_r: 0,
                        leg_l_upper: Math.PI + 0.12,
                        leg_l_lower: -0.08,
                        foot_l: Math.PI * 0.45,
                        leg_r_upper: Math.PI - 0.12,
                        leg_r_lower: 0.08,
                        foot_r: -Math.PI * 0.45
                    };
                },

                mom_wave: (t) => {
                    const wave = Math.sin(t * 7) * 0.30;
                    return {
                        hipOffsetY: -70,
                        pelvis: -Math.PI / 2,
                        spine: 0.03,
                        neck: -0.03,
                        arm_l_upper: -Math.PI * 0.88,
                        arm_l_lower: -0.15,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.28 + wave * 0.35,
                        arm_r_lower: -Math.PI * 0.22 + wave * 0.5,
                        hand_r: 0,
                        leg_l_upper: Math.PI + 0.13,
                        leg_l_lower: -0.08,
                        foot_l: Math.PI * 0.45,
                        leg_r_upper: Math.PI - 0.13,
                        leg_r_lower: 0.08,
                        foot_r: -Math.PI * 0.45
                    };
                },

                // FRIEND SPECIAL ANIMATIONS
                friend_groove: (t) => {
                    const beat = Math.abs(Math.sin(t * 5));
                    const sway = Math.sin(t * 5) * 0.15;
                    return {
                        hipOffsetY: -69 + beat * 5,
                        pelvis: -Math.PI / 2,
                        spine: sway * 0.18,
                        neck: beat * 0.22,
                        arm_l_upper: -Math.PI * 0.62 + sway * 0.25,
                        arm_l_lower: Math.PI * 0.55 + beat * 0.18,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.62 + sway * 0.25,
                        arm_r_lower: -Math.PI * 0.55 - beat * 0.18,
                        hand_r: 0,
                        leg_l_upper: Math.PI + 0.18 + beat * 0.15,
                        leg_l_lower: -beat * 0.25,
                        foot_l: Math.PI * 0.45,
                        leg_r_upper: Math.PI - 0.18 - beat * 0.15,
                        leg_r_lower: beat * 0.25,
                        foot_r: -Math.PI * 0.45
                    };
                },

                friend_bike: (t) => this.computeBikePose(t),
                bike_ride: (t) => this.computeBikePose(t),

                // NEW SLAPSTICK & MILESTONE CLIPS
                flaunt_phone: (t) => {
                    const sway = Math.sin(t * 3) * 0.05;
                    return {
                        hipOffsetY: -70,
                        pelvis: -Math.PI / 2 + 0.04,
                        spine: -0.06 + sway,
                        neck: 0.04,
                        arm_l_upper: -Math.PI * 0.72,
                        arm_l_lower: -Math.PI * 0.56,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.45 + Math.sin(t * 4) * 0.06,
                        arm_r_lower: -Math.PI * 0.32,
                        hand_r: 0,
                        leg_l_upper: Math.PI + 0.15,
                        leg_l_lower: -0.10,
                        foot_l: Math.PI * 0.45,
                        leg_r_upper: Math.PI - 0.15,
                        leg_r_lower: 0.10,
                        foot_r: -Math.PI * 0.45
                    };
                },

                car_crash_accordion: (t) => {
                    const shake = Math.sin(t * 35) * 0.12;
                    return {
                        hipOffsetY: -70,
                        pelvis: -Math.PI / 2 + shake,
                        spine: shake * 0.6,
                        neck: -shake * 0.6,
                        arm_l_upper: -Math.PI * 0.8 + shake,
                        arm_l_lower: Math.PI * 0.7,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.8 - shake,
                        arm_r_lower: -Math.PI * 0.7,
                        hand_r: 0,
                        leg_l_upper: Math.PI + 0.2 + shake,
                        leg_l_lower: -0.2,
                        foot_l: Math.PI * 0.45,
                        leg_r_upper: Math.PI - 0.2 - shake,
                        leg_r_lower: 0.2,
                        foot_r: -Math.PI * 0.45
                    };
                },

                wheelchair_sad: (t) => {
                    const sigh = Math.sin(t * 2) * 0.04;
                    return {
                        hipOffsetX: -6,
                        hipOffsetY: -36,
                        pelvis: -Math.PI * 0.55,
                        spine: 0.12 + sigh,
                        neck: 0.24,
                        arm_l_upper: Math.PI * 0.75,
                        arm_l_lower: -Math.PI * 0.25,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.82,
                        arm_r_lower: -Math.PI * 0.25,
                        hand_r: 0,
                        leg_l_upper: Math.PI * 0.55,
                        leg_l_lower: Math.PI * 0.48,
                        foot_l: -Math.PI * 0.45,
                        leg_r_upper: Math.PI * 0.58,
                        leg_r_lower: 0.02,
                        foot_r: -Math.PI * 0.45
                    };
                },

                gravestone_mourn: (t) => {
                    const sorrow = Math.sin(t * 1.5) * 0.03;
                    return {
                        hipOffsetY: -36,
                        pelvis: -Math.PI * 0.46,
                        spine: 0.16 + sorrow,
                        neck: 0.28,
                        arm_l_upper: Math.PI * 0.75,
                        arm_l_lower: -Math.PI * 0.25,
                        hand_l: 0,
                        arm_r_upper: Math.PI * 0.82,
                        arm_r_lower: -Math.PI * 0.30,
                        hand_r: 0,
                        leg_l_upper: Math.PI * 0.78,
                        leg_l_lower: Math.PI * 0.65,
                        foot_l: Math.PI * 0.25,
                        leg_r_upper: Math.PI * 0.84,
                        leg_r_lower: Math.PI * 0.59,
                        foot_r: Math.PI * 0.25
                    };
                },

                hospital_surgery: (t) => {
                    const weak = Math.sin(t * 1.2) * 0.02;
                    return {
                        hipOffsetX: -10,
                        hipOffsetY: -75,
                        pelvis: 0,
                        spine: weak,
                        neck: -0.08,
                        arm_l_upper: Math.PI * 0.15,
                        arm_l_lower: 0.12,
                        hand_l: 0,
                        arm_r_upper: -Math.PI * 0.15,
                        arm_r_lower: -0.12,
                        hand_r: 0,
                        leg_l_upper: Math.PI + 0.04,
                        leg_l_lower: -0.04,
                        foot_l: Math.PI * 0.45,
                        leg_r_upper: Math.PI - 0.06,
                        leg_r_lower: 0.06,
                        foot_r: Math.PI * 0.45
                    };
                }
            };
        }

        play(clipName, expressionOverride = null) {
            if (!this.clips[clipName]) {
                clipName = 'idle';
            }
            this.currentClip = clipName;
            this.time = 0;

            if (expressionOverride) {
                Object.assign(this.skeleton.expression, expressionOverride);
            } else {
                this.setDefaultExpressionForClip(clipName);
            }
        }

        setDefaultExpressionForClip(clip) {
            const exp = this.skeleton.expression;
            exp.eyeType = 'normal';
            exp.mouthType = 'smile';
            exp.browType = 'normal';
            exp.blush = false;
            exp.tearDrop = false;
            exp.headProp = null;
            exp.handPropL = null;
            exp.handPropR = null;
            exp.extraEffect = null;

            switch (clip) {
                case 'flaunt_phone':
                    exp.eyeType = 'shades';
                    exp.mouthType = 'smug';
                    exp.browType = 'raised';
                    exp.headProp = 'sunglasses';
                    exp.handPropR = 'gold_phone';
                    exp.extraEffect = 'star_sparkles';
                    break;
                case 'car_crash_accordion':
                    exp.eyeType = 'wide_shock';
                    exp.mouthType = 'screaming';
                    exp.browType = 'worried';
                    exp.extraEffect = 'accordion_squash';
                    break;
                case 'wheelchair_sad':
                    exp.eyeType = 'worried';
                    exp.mouthType = 'frown';
                    exp.browType = 'worried';
                    exp.headProp = 'bandage';
                    exp.extraEffect = 'wheelchair';
                    break;
                case 'gravestone_mourn':
                    exp.eyeType = 'crying';
                    exp.mouthType = 'frown';
                    exp.browType = 'worried';
                    exp.tearDrop = true;
                    exp.extraEffect = 'mourn_rain';
                    break;
                case 'hospital_surgery':
                    exp.eyeType = 'squint';
                    exp.mouthType = 'frown';
                    exp.browType = 'worried';
                    exp.headProp = 'bandage';
                    break;
                case 'happy_dance':
                case 'rich_swagger':
                case 'friend_groove':
                case 'friend_bike':
                case 'bike_ride':
                    exp.eyeType = 'happy_curved';
                    exp.mouthType = 'grin';
                    exp.browType = 'raised';
                    exp.extraEffect = 'music_notes';
                    break;
                case 'dad_proud':
                    exp.eyeType = 'normal';
                    exp.mouthType = 'smile';
                    exp.browType = 'raised';
                    break;
                case 'mom_cradle':
                case 'mom_wave':
                    exp.eyeType = 'happy_curved';
                    exp.mouthType = 'smile';
                    exp.browType = 'normal';
                    break;
                case 'shocked':
                    exp.eyeType = 'wide_shock';
                    exp.mouthType = 'open_shock';
                    exp.browType = 'raised';
                    exp.extraEffect = 'sweat_drops';
                    break;
                case 'crying_broke':
                    exp.eyeType = 'crying';
                    exp.mouthType = 'frown';
                    exp.browType = 'worried';
                    exp.tearDrop = true;
                    break;
                case 'sports_car_flex':
                    exp.eyeType = 'shades';
                    exp.mouthType = 'smug';
                    exp.browType = 'normal';
                    exp.headProp = 'sunglasses';
                    break;
                case 'cinema_sit':
                    exp.eyeType = 'happy';
                    exp.mouthType = 'smile';
                    exp.browType = 'normal';
                    break;
                case 'hospital_bed':
                    exp.eyeType = 'squint';
                    exp.mouthType = 'frown';
                    exp.browType = 'worried';
                    exp.headProp = 'bandage';
                    break;
                case 'dead_flat':
                    exp.eyeType = 'dead_x';
                    exp.mouthType = 'screaming';
                    exp.browType = 'worried';
                    exp.extraEffect = 'skull';
                    break;
                case 'idle':
                default:
                    break;
            }
        }

        update(deltaTime) {
            this.time += deltaTime;
            const generator = this.clips[this.currentClip] || this.clips.idle;
            const pose = generator(this.time);
            const pelvis = this.skeleton.getBone('pelvis');
            if (pelvis) {
                pelvis.localX = (typeof pose.hipOffsetX === 'number') ? pose.hipOffsetX : 0;
                pelvis.localY = (typeof pose.hipOffsetY === 'number') ? pose.hipOffsetY : -70;
            }
            this.skeleton.setPose(pose);
            this.skeleton.update();
        }
    }

    class StickmanRenderer {
        constructor(ctx) {
            this.ctx = ctx;
            this.shieldEffect = { active: false, timer: 0 };
            this.groundOffset = 115;
            this.cinemaPosterImg = new Image();
            this.cinemaPosterImg.src = 'data:image/jpeg;base64,/9j/2wCEAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx4BBQUFBwYHDggIDh4UERQeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHv/AABEIAcgCpQMBIgACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/APlIClxS0DFQdIUYpeKcg6E9CDSARlAAIbJI6elLGpYkHjApwXdggDnuKnQhYwmwHnlu9AiHZ02nj0p6IMdKeqnqBmpAnHFACMAMYYse4x0oUGnqr9OKVRnj8KAEx8wNIqkYqXZjvRtxQA3GaeFAUAUqipY4mdto7e1Jj0I1HNSwxbny3T2qX7DMVLY4FWEtmiiUFRn60mwXkR+QvpUyIMYFSJGZOAMEd6n8oxgNgHH4ZqLm3KQCEAgkfN6e1SsilOOCoBGKlDYwFJG4eucfWlRC0mwDLYqbinP2cdSFYyylvvbRyPWtCSEW+lIhRi1xzjsFB5/Gr2haNdzzee0LrbKpEjnpjH69Kp6jLPLNGq/6uNfLjUjov0oueY8RGrU5UZgHTYvGcfSggjg1ajTblAuNxwR61dSwDRq0ksUZONqt/WnzpGFXFRpSszIUYYEjI9KcELLhAODwB1rXn0O8EgYeQFYgD94P5ZpRHJZjZ5cZkBwCCD09aiVS7sjz8TjY6cm5Ba6VLMitIVRDyS3GBUPiOSOW78uIllUbUUjt3AqR5pPLnE7OkmAUweM5rNxzknJ9aRhh6NWs+eRe8P26wzXN3IxVIImAb1Y/Lj9TVCQqiEFQW5qdmKW0ZKbiwOCe3vVW2t5r26FtDzI/AJ4ArWOp6srx96T2IpTlQwOecc1JYQLNIzT5WJSSxH8vxrTuhDbIIkCbEwOB/F61Qa5DZUkkHOOMCiM7omNWVWPuole5iTK2kIjV+GOcmqshzg457/Wm7c4IJFOxVqydzZU1EYc47U3pUjKeuOKjcEdQRVblqaQxjwa7X4c28VlBd+JbgErZKPKHZpDnH8jXJWNpPfXkdpaxNJNKQFULnJrv/GsUHhrwHZ+H/tMb38krT3UaYPl8ABSR+NYVHzNQPQox5Y8555rt9catqEl5cyF3c5Y+p9azZgAVSpGJ8wEH5RTQDnJrsiktEZpObuxu1RyvfrxUsC4SSRsYVTj69qbSkFk25OM5x71qkbbECHEmMn1ximyDD4yABkg1OIzEVzg5Xg5zUcyNu4UEgVVhMaOepxmmsjZ46U/g8cjFOHpQZsgx+FLt96l8lipZeeenemr6HrmhGdyNloxxT3UluBxUeRVJCbFBwjLjr0PcUKOQc4bPWjHANOQc8jpWiT6EO3U1tHv455I9P1JBPA52qzfej+hrM1G3+yajcWxGfLcqGz1waeijlg20jBA9al1VZZ3W5KH5gOfX1NdkpucLdTlS9nK62KQmIODyvcVMLnMIIXr69qgEZzjnd6UbmAHGQRxmsU2jrepfiu4lQqBg464p0jK2C5PzDoOeKzlySmWwW5HNWIHcR4OATxk9atVBWHtGijgfKOnvWxa3A1Lw5dWU4+e1XzYWxn6j9BWRI6BQOQOnPrWv4UvrbTrwC8hWW3uAY5kYdVPoexrooP3rM5MZdQ5l0ObVQMHOfUVLC+7knA/lVrxLZpYa5dWqAhUkIAPpnis+NgrDdnb7VzyXJJxOmjPmgpGkkRwMHepPTvU5tSo6/T1FMsbiKN1wuSvv96tvToIdSmJaVYmkfaEXIIHrXXCCnGwpS5bswLiMyR+VLjH8DD1rGuYXhYq/UV1Oo2ipI0a8oDww71l3EaSq0Mn/AAFvf/CuGrF0peRvSqKSMZQTk8gD1oIq06GPMbDA9qhC46itFsO5HijFSuoxwMUzBoGLFBLKJGjUFY13Oc9BnFK8xeCOLYgCdCByfrTCPWprS3a4uY4F2hpGCruYAZ+p4FOwyACjFWZ4GgneJtuVODg5H5imLtJwQKagJkJFIysCQwwRUzoPTANMZSDkknNHI0MjIoxTiKTFDQMSiiikSFFFATGDn60rAxCcGlpdvtSNxTEFFJn2P5Uc/wB1vypalXFPFApw2/xdKXCA8DPpXhmg0e3BqURk8OeeDwad5YIyTmpI4228qcDk/SgAVRnrUqoD1qWO3D/6tWI4qRgwkO4EnpzxSFcgQBRjBI+tC55zxVlLS4ePzFhYqOp9Ki2N6Z5p3KsMGNwzkjPOPSpJWiMhMCFI+wY5NJ5bHtUiQscHj6UhWGLzS4q3Fb7kAAGeuDSm2x7GpGiGKEsa0rOJY4/McrgnJHfFVDGy5C7sE8461ZgCsCXY46KDQ9QaLE7h4gIt2wevr61XjVmc45zVhFITZxn2qSJApIby1IPbvUlQ0H20fyYPX6Ur4ACsD+BpUOO9PCs/IFS2dUuVK7ZBJ8o6dT+VacFsI7JbhyAXydo+8AKr6fZy3lyIVjJYHqV5H41u3trALZ3j8o+SOgPzH1z+Oai54OYYlVJKEdTO+2TR2ptluJPLDZIz+X9abZQG6dpGPlIgyzdRiqg3SXIjQFi5+7itDVo44JI7JZwREBvPPBPJH50mcNRRpq0dyO8lhiLC0i+XpvPLGorJYJJUku2kCIM4Ufex2qVIwTvmiyrLgPnI3f5xVe+m/dKkfABx83ehHLZ1ZckfvItTvJ7y6aSIeWMgAL6dBSxzFUwWzk5yetNsgTOTLhAvI7im3MZj2klTuyeO1M9ell1NRSmiK7l3r7dj61Loem3OrajHZWygu56k4CjuT7VJpmmX2qXYtrCzaeWThQgya9PuNM03wF4dSxl2PrF7EzXEi9Y14wg+vPPtQa+z5Yvl6HEeKbTR/tVvBayqIreJY2aIf65gMMwznGTzVEXVhZQstrb7JWBBkc5b/Cqt5Ibi5llYqMsSABwPoKrGNWQgghyc5PahHmyw8p2lNlS5l86RnHXP51Ci9KtxQyTNtjUnJwK7HRfhtr2p28Vx5SwQSDO+Vwo/xq5TjFHq0MPJq0VocPGoYElgMHnJ6U4Lnrn8BXqbfCOfbEZNb0lQ3XExYg9hgCuR8U+Dtb0W5eG4s2wjEbl5B7ZqY1Yt2FiMJUaOZPDBV4yD+NQHBUGtBdOvG4ELbicY71C1ldCdIGgdXdgigr1J7VrzoxpYSaadj0j4KWdrYadrHiq9t/M+wwn7OX+7vI/nzXmfiLUptU1Oe5lckyOWIr0/4hmTwr8PdM8Jq4W7mUXV5tPqcqPqOK8jbLtuC4z1+tTQXNJzZ6Va6goohxxUZJBqZvlJXqc9vrUZQqRuIzzwR0FdiFFCnbgbc570uGIAUbmPQe9KoUjjAwOTSwwyOx8vnA5wccVqitxJdkRZJArE8HB6VDMAMGPOOgwanK44PX0pk6KB1A7/AEqhtFVmO4EqePWlPI60AODyQaUEE4pHPJ6gpYOGBwRU29ZCBIuPcVENrAKVxjuD1oKsDkNx7dKCWybynU74/mA9KI4o5jtI2O3f1piykEMpIbPODirPmIw5zuPeriRcpvFJC5R8qR2pArHhOvvW1AlvOphuTg4+STrj61Wu7IwnJAcYzlK3SJZRU/nW94euLKeJtP1EqiP/AKmRuAjH+hrDlTYSypz70zBbgda6aFTklsc9enzx31Oh1Hwvq1nEZzZSPDnKui7gR6g+lc5cQMjlmVlxwQR/Kt3Qdc1bSnQ2l/MmP4M/Lt9K6yfUPAOpq13frqFrdzDdIkKAqrd8c10+yp1tY6HAsVXw7/eK6PNF3LIHPYjaOlPEilvvjk9+K6rxN4aso7WLVNHuxeWEpxubhoz6MO1cu0CtJt4LAdq5q1GVM9GhioV43iJIAyEf1q9oEsK3Ma3a7olbq3bNLpFoJrqPfKqIWAya3vEOiQ2xBSSNkYA5U4DE1tRoT5fadjDE1Vf2T6l3x54au9Tki13TP9Lt5YVMhjGcPj5v1rz2WGWKYxyDaR/CRg1vWt9fabCv2O5lj2tnCMQK1LlU8UaTLOEH9r2y75MHAmQd8eooxEKdR3jozLDe2w6SlqjjIhk9TjPY9K6bwjL5eqok7AblKo2ORkcVzMkTxSFH4IP510Xg1La71WJZWb5TkAdSQK5KblGWp6kHGo0W7y5UsyhDlflJ/E1RuoEmVfLwGxnPrUN5Jvupi5VAXPHtmr2lATSBR8x6KPWurn9p7skZz916GVLEGQwToQ6/cbpj61myRsjFCpBHrXd65o7yWqyxJubgDHOD6Vzc0G8PDINkvQZ7n0rmrQlRdmbwlGezMQimEVbnt2idkbGV61Xbkj2600JvWwzaDT17UY9BTljYkcYzVBqGSepqWMIF+YA56GoWUqxBpAxUgg4q0xpsllQEgp06kUyQkrgLg471YV42iBKhT1zUGMy7sDHPaqZdyBlxjmkI461Nsy3zfdxg1GR2FZtBcjxRipDwucE+tIAc9KhLUBhGFzTscDHWpAvqKTGDmrsJjPp0oAFPwKWlYm4zOOMUZ9qfRQFyEcflSpjBz+FNo6V4R0E8TEvkncOPlq58gAbeWyOF9PrWdExBAUlcdDUqMzDO40gN3Tb6ytVzLC0hxyAeKmvNXtJIhFBp6x5BLPkljWFCGY+1TbccUmKxpabfPAxfcXRgQyMfapDd2oJ/0QMTzyTis2L5RUmc/wBPelcq5dE9m5z9n8v2zmpEWCTcUB3DoCajttPMyq7SBF6kkdqZJEvmhUkLDHUcUrgWVlt/LCMCHB5xT7iS0ZV8ncD3yetVNoAHrT1BGCFwaBD4wS+QCau6fYXNxcbAgRT1ZuAPzohuXgTbsXkA7u9Olvbh1w0hqZD1Lc9tFauwEq3LdQV6D/GqTK7Esqgs3NETfMDkj1Oe+asxu2cRRs79ORwtQ2DcYRcpuxFEkrAALzXTaXYwWWmf2lqMZKuxSFVPLMAM8enIo0i1S3hhn1OJiy/NGjcA88Z9qrapdi5mjDooJJO1Ow7cUrny+JzCpiZ+zg9EbFrrMBUwWtlDbbl2ucEtj1yf6Vz9zFKLxxE+EbI54FJNIIj5xZCzcHjGfcio1u5pJUihUEscqMcZqLERw9WgnKGtzV8NxW1tBJqdzA8zp8sSjpn+8fpVeP7Obie4klVnbLANgg/nUWvXghhhsopEkZRulZem41jPcysu3IAxjgU7F4TB1sRJym7I0L2+EyrDtVNvQg8VnSXYyA20qBtHB/OmRxvJKqL8zMcAd810V3FZ6LapavbWt1cgB7hpF3bWznaKdj11Thhmow1ZkWSySskcKlyWyFUEkmtNfDmpO8QmjKPOflR+Gwe+Kil8RX3mM9r5VnGy4KQjaMY9KoNqmo7mkjmZSRgsDziixNWeKnJdEdppPiK28FX0MelATzI4+1TkA+YvdU9vfvR8WL1NR1CLXbOT7Ra3yhl+bJjI6p7euPeuALGZh5mXPvXVeFrj7Vpt3oN1OkSTYkgaT7qSL/8AFZH5Umjrppyg4Pc5p3GchdpJqWygnv7v7NEmQeXPQD3JrQl8L6vFcKlxbS+QZAvmIM8Z68V1t3d6B4XtDZ6bbtc3hwzySDjOOPrj0pe05dBQwkYPnqbIueF9K0jwvpLatqyxXE+5RBCTkMeefccdRXG+NPG+qarqMrJcSQw5xsjJVVA6KPTFZ2vatd6lKz3c7MX5xn/OKyobYyYhTLFjwKUIa3kbVMZFR/d7E0esXqOrrcyqw+6d3Ir0Dw18SNTs43t9WtYdTiZcN54JbGexzXASWv2fLSKOB075qhPNO0pVJGx3zWkqXNscccTVk7x2PV734p6TDCIrfw3p6EnghQSD9TW54f1bwzqtjceK9SgSJ7cZSHGA0nbj146V4JKq5HfAzmlWeREKK7BTztz39cUvqzfU7aeIaXvG74112713WZr66lMjSOSOPujsPwHFYkTjG0EE1WMjN1OaC4AwAc+tdcI2VjNz5ndkrO0e4HBc9Tjp7VGnzldxOBx9fakL/KNzZHYdxQdgUs5JH90dc1qjRMfJC+PN2hE6H2ojdV+YtsTGDTSWkAClueg9KVrWZnDc/j6VogcrK4kkqEk7CWPAPpVW4mZmweMVqQWu3ACEu3tWiuhC5VyyncPXirRhOukjl0YHA3ZPpT/StO90eW3GBGQPU1lFWSTDVLFCSmroU5XkU5GxxSZzRihEtgSu4YIzTlclgrjvTFRFYZJGe9W/s7Mm/OR61tFXRDHoFYg52sP1q1bXTKSqrlu4xkGs53eMgKeRV2ycSckDPY1cbydjNtx1JbuS3lA3IAxPz7cjFU57J4jvRsxHkccCtC5gEiYVOevWqgM8DHLHAGQD/KtZJ0xRmpsgj+Yhc7jjt6UrRqygqZCMZJx+laFtdWUyD7RbGN16PGe/0pL6OMx71X92ejA9frW9KUZK1xTUlIm8KXUEF8+n3snl2l2Np3H5VY9Gx7VX1jQtU0mZ/tNu0aZyrgdR65rMugV/1Z5B7810ek+KdVSx8qdhPDDjKycgj0JrojKM1aRyVKc6c+el8zn47iSKRQCAq9dw5P4V1D6pb6haW6yRbpkYKqr0qtqNlpWr6Tdahp0EttcwgO8G7cuCRkg+grBspnQgtIVHT2zWbqVKLt0ZrFxrrXRo6aWyt55pHOY2LbPL/wBoevpU8WgzaXewX9hcCR0AfYD1Oeh9qp6PfxxS7Si5blmJ6/8A166nThaMm52BjQ7m45Oelb0lCevUwrymlZbGbqJ8KalPMl5ZyaZdEDEkR3Ju9COeKbpXgjU7O6hvreS3nshIHM8b8ADk9+DT9SGnXV8I4oEw2SW/pTvDeqz6fezWjgjTJm8p4pPujPBP4daiUYOVmZXqQjzU3Y43xGbQa7dfZD+43/L/AF/XNJb3CkKEJyvIxxW7408LS6bfBUdJIJR5kUqchlP+Fc00D277WdcgcbeQTXLLmpyuenRnGqlrudppviCWK1CYTcCMdOv41V1DSF1CD7Skq+dgttRhlhkYrBsrgOu0ny9vKknnNa2m6k6gJuBO7LY6kfWuj20aqtMjlcJXiZ09mHuBaXCMk5/iY4z6A1j39i8DnapwGwVxyK6vXz9vhWSFNsitgAHkjtzVKxj+3EwXPyT/AHUbs3oDXHKLpz5TrhPnV3ucwmQjYAz70wkkda3dV0iazkaORMbAc56isORCrMCRxWzVkKMrjc+9FKBn69qcI896m5XMIrYwSMj0p42HlGO70IpjLhT7HGaQcEc4q0ylIseUXYqpx6GoWj2EN8r5GcZ6U+OZ0JHU4qZpUciNgF9yK0snEtFIswDADANM5HHNac9kVjDAjDDIqlLA8almBxnAI71k4WAjyefrSg5OKkSDdBv3fOBkpjpUYGDSEwwKMUtFJktCUUYoxQIixSVdtf7OFlc/axObrj7PsYBe+dwxz2qkDnpznpXgnSOiX5s4qVFIUZwc89KVIWA3NgD+73NPiyW4XJ649KBE8AxGM9cVIilzwD+VNVmPBQce9X41SCPeTukP3R2FDGV1i3HAyD9KvQC2iUmePfjlcetRxyylgCQRn+7V9rFGVDPmLf0AOTWZN7EE11HIVSLKovb0FV34TK8HP5itY6XbeUPJuVGB83mcGprPRrVbZri9v4vlPEcfJb/Cmc88bShp1Mm2iMvYnJwBjk1eFjdKu5rS4CAdShHFWJtXuLbbDbKkUSHKgKCc+uav295qNxAbu8vh5MWMLgfOeu2k2ZzxFdLmtoYkqENtbLA84xg1JAiLGjYDFuOc8H8a1JdelkmU31nbSg9ymDt7DIqdZ9FhUSwwTPK/3Y3YbUP5c1LMJZhXpr34EWl6NNeSRyMhigVsOSMbvoO9dLfSCxtIp2sIrZFTbEm0b3H95u+api4u0jS9uJA4IIRFGAvFZ+q6iLmEs7vIAOA3apPmqmIr46sl0FvdfvbuUrOFbChUBQHao6AfhSSx6c6Lci8gj3Dkcls/SsZJd28/3uKgdMdM0rH0yyejGC5JWZs3zaJ5CiG7d5CM5MZxn8qQ6nYWFgYNOi8y4lGJLiQc49FHb69aw9gOMkjA6d6ls4DJMEXJLHAqrGscByq3NcQq8sjSqPlB5zx+lIYx97JP1q5MGjiyuSSec8jFA0vV3Rbm2s2eFjndt4NI6nUp0UlLQTSxcpqFubbYZmYbQSOKtaxAsd1cCO8SdVk2uzkEu3c1pRafPoWjnVb2ILcXKkW0Z6rjq36iuaLszMSAWfkE0jhov21dyix/lDP3F+nrSypL5Ycw7VPIwOD7V2Oiab4f07SLfUPEXn+dOC0FvFySnTJ/EGtNvGembX09dCtX0vbtRDxKo/vbvX8Klza6Hpeyba5jziCREzkHI5Ge9See2dyqBn0rb8Y6VaWt1HPZRTpBcRiRFk9x61i29tJ5YBOTmhSucWJnKjJo2tB8Waxo7sbS4KxsArRtgqQCD0P0rQ8cwzG7TVghKXcQmQgZzxg8/UGuYkgWJikufp6V2ugyrqfgm9sCQ8sGXjJb7igZwP1rOSV7sunXdek1M852edIeoLHOc5rVsoRBIsinDbTz24HrRLpn2VmkkbaGUlB+VV494j2CfOOxFaJ3PPinXi409iC5kj+1M2WYd8etU5ipfI5qabdvckkEioGHI4zXTHY76MEokEvHKjp2qAjuM59DVuRdrdcionAPWtUjRlcjC7sYGcUqbmUooyc0+NNz88qCc5qaNMMyIAOMgkVSFYgWFYSQAJCf0oEUgIYAEvxjqatpF8xKI2Dxk1t6Towd/PkiIjUjknk1RLnZEOj6L58STAFmz0OcCt+08LS3iLchSkOSmQcZI56VtadrWmeHg/lFCNmMSrkk/wBK5jW/G7F5PsMKQljklSevt6VrGSSOKVSpUdkak9lpenRkk78D5ST831xWFe+IYknUREyMPly4zxXJXurXU0haSdmJ96gtpwzBpAcnpTckaqnde8dnFqUV2P8ASN0meAuPu/SsvWtHJAlhjZlPIIz+tR2DrIwEbAt6Gty2vtimIYZWGD6Y71UUnuHLy7HDShoeGFEcqkYJwc9K6vVdEW6iNxbEkYyRjpXMXmk3MTcL046U3TZaqxeiepLBHvbIAIHNaSsIolUgBSOe4rJiiubUBnV1PbI4Ip0k0j5y49xmqi+VWFJ3G3RDSkp93PFSWe8PtXJ74zVVuvWtLQLF77UEthOkLMMIz9C2OAT71pTV37opNKN2aVpMdhMmc9hjmi98uXKldpxmmXkd5ZTPb3AKTIcFCO1UjqPmJswSQ2M101qj5OWRz04XleJHt2k45ApyXDcBgAueVoLjGTwO9JEhl5IA+XIGa4FvdHYtDasrOx1JWMKBZiAAmRnPtmm/2FKjyeZzCXUsg6jr2rLtp5rWVZonMbKcgr1FdFpniaGR1i1WItASFeSL5X745rpp1dbM56lJ/FETSUh0rVlDRu0cx8gpnja/GPwzn8Kx9Z06XTdSkgktmOGPljjaRXXtpV086tDGJIXAZJRztHUEmtfxdpv2mS3RjiaKFQ5PBY816nsFVh6Hl1MW6NZOXU8nHnSuIo4iGQHoMZq//aGt2MYiuBIqMvyAqM4+tdra+HAbMh8+Y7DJUcfWrGq6AyacI23SIoBw46D/ADmsFhpx2NlmNGZx0cy3GmmeKQo8ZxJk/e9sVr6K9l5cdzIWmEjBGRk4HYmn3GjRKqRwFDznYOM1lygWTmTEjbD86EYANTb2bvI2k1UXuHp0P2GXThYXNl5tif8AVFAN8ZPv6VxnjTw9aS2v9oWUL26xN5ci4PXHDAe+Kt+HNcc2olDBUJ2gE12Wny2V4JrWfaVlUqBnI9j784rabhUWh5yVShPQ8NsILiCVWmjyofk9avTKv2tvJIyVyMcV6drvgSa0thIQrq53DYO3r9K4nW9ENtI8kYYgfKD6msZYeUFdnp08RGbsUdPe4Ejfugy7SDnoM8VJqVni0iuowYnPG1zjNPW8Wx0uIysWZnJePHTjA5ro4dY0q10CK8vbMSifKwxbsM2MZJJBwPwrilVjJuMnqjrtKDTOVN99sgWC9Q+Yo2pMAOno2Oo9zVW50R2cooG7b97qp47HpWhGdMnW5nvIZrVpCWRYuQB1AOffFVIZ576aHToGCqillbB+tTDEKEbPU3cJT1WhVXwrqP2GW8MASCP5S8jBAT6DP3vwrHmikico64KnkYrqdZ1bUdQuo4J2VYrUbEiUERgdz15PSpPDOmWut3c0V2rYEM0nBwcLGSP5U4Vk2EqdkcYy8nt9KQLx8vIPTPY1JKFSRkbsSBz+VKYpApduwyfrXQmZqRGAvTAOecHvUeMhuhPSpWUsOD24pNuPzo5mXdlrTJ/n8mRQykd+wrXvNNgmslltySwJ388DGOlYcMgjkDECtKG8iKbGdljx0z1NdVKpFxakNSMmaGSIsVyV6Ej+VRBSGG5Wx7VrxSW0krLsaQk4UhuPrUtxp263Mock5wMDqKj2V1dMq5iTsGZcIq4UDjv70wDJxVuSyl342n8qia3kVthHzGsdRXuQjpRUjwyKxBxSeW/qKAJNZvP7Vv2uzaW9ruAHlwRhEGPQCoIVC/MUB9B6VKCgUgqDnoaVYpGG4IxX1ArwDe4KcnHJ+tWLdCzH5QBjk1HGBs+Z9gB/GrBBcbIhhcZOTjNK9h3GqVMmyL5h61OIY1GSxYnuetSWVsVGShA6/Wryoss3zJkkc7R90VLZLkkGnhoGVo9vI4buTV3LMpkd+SeWzzUps4o0RYvmfb37f/XqCXCcOAy4PC9am5zOr7ZWehcEccgwgJ75BxmqlzArDIIBGTimQXLRQ4VSSScf4V0mh6Gv2dNS1aSOKA4ZIc5aU9s45AouePX/ANkk5yehztlpU93tmdltoM482Q4H4DvU+oPGiRWVnKZIYQTnbgFu5q/rFvfX06MqhYFB8tVGFHtWUtvOruCPlxySMdu1I7sPio10pXIxblwrhfu89elWNPnWGUEgHnODUEr/ALtYhwo5PrmmZX1p2O2rB1Y2OnutWWW2WPALAYX2B7ViXUyFUhCcgc5qKCXYTuVWJHBJ6VH8zOGPrSscGGyqlhryFIKdiR7CnEH0qza/6Q4hGAmfmbOcY5JNbto3h61vIo5A98T94ySBYl/3sYP600jonjOSVoK7OUUEyMcdsdO9TW8k8TIqkowPDeldjB4l8GyQmO40mD5yw3x7wQB369zgfjVbytC1pVu9Nka1Yf6+DOdijuue+Kpqxn9eqbyjYqaTaIkMupXs6rax87B9529BVTUPE2q3p8tLl4YU/wBXDHwige3rUWsXE2oTmKFFitkX93H7f1JqlHbBXUyMYwemBmosZwpubc6oskt7qEqJJM7gttTcxIX6fnXotv8ADWZdKS41e6htJSNxjyMog6k9+nYV53ZyiyvA+5mVW3KpGR9a9HuJZvGdoLy0umj1NEAeMvgS9iQOg9axqNpXR6+X06UVojjfHF1DPr0iWbk2sSJGhz97CjmsNZWU4XrW2nh3U7zUlsIYCbp5Nm3tkdTn0967nQNE8PeH9QtrPxDYCQ78PJMrhpP90ZAwK2owcomNfEp1LXKPw8totfsRo+q2sgy2ba6U8oe3HcZrkvENsumarc2oYOImIDY+9jvX09aaR4ftdIGoaPaxJHCjS24XJ3n09RzXzN40juD4guZ7pvmlYll4GBmsOWSmPETp8qbMNpJp2WQIzEnBHrXo1tEvhjwIkskamfU3JJPVYxxj+fNcbpU1vHeW8asreZKqg/w43CvRfizp8U+i6bdWcxS2ih8nbnKhsknB/GoqOzszGjLmozaR5vdXxklc8Kc5A61n5ddz/KY+/PWkkRRKycFh1IqONCjlcE+xrWFlocmGoujC8URM2WOEx9PXtUiwx7d7khvatO2gglgMny7lGOTx+lZd4QT8p4yc4roixwxTqyskVbg7nODn3qBwRzjt1HWpwvLfL9KlihDLtPX09a1T0OxtEFvb7lB5HGeKsJbPgELKc9MCtK2tWSMDytx+vSq13fx2cZUyMrZ6ZFaId0IzR28W6UMXyOD0qKfXZN5jiOARxgdKzbqY3B3OzvnJAHSqTZRs4xkcZ9DTEoJ7lm9uLuVz5ztg84JqpDa3E02052k/d24+ldj4U8CaxrNlBfNbSwabJOsL30ilkQnpmvqz4c/Anw3oUMVxq0w1edo1Yb1wo7jFNIi8VsfJvhj4beI/ETMLDSbmYKcEgAAH6mux1v4AeM9G0t9QuY43CJuaKM5f3H1r7dsrCxsY/LsbSG2Q8kRoFyfU461X1eKBniuZvmaM/KhJwSeORVJEVJ2Vz84HgksXYNG0Tq+0xOCG+vNC3DySqqlgc84r6M+PHhjQvEHiYR6ZDHbXcMfnahKvCKuTtB/2jg14jJ4eksrsiT7ing55NVYlyVrmr4XLKy+ccBjwB3HvW9eaFY3SGZIhknOAvX3rnLKQ25BRTkHitO08TC2njDP+75DDuM45rshNW1PNxUaj96BR1jRvLQqVwm3BXHNcXqGkyo5cDYAeN1e7G3sta017uwdGESAMiqSScgE5rz3XdPUTSKzqpPYsODWsownHQzoYp35XuebsCrlTVm0m5Cytt9D6VZvNMdJi+dxzyKzpVKuVI5rCK5Nj1k1JWOguJpNUALTRmdBtDk8uPr61mtFLazBbiJkbr8w61nec0bDkj0NdRo3iCRoPsl7bW9/Cq9JV+ZR7MOa3hao9TmfNRj7uxFaxWt7H5YiEUhOSynrVi20i5jzIxDgehrTstSitzssLaKCPGTvRWOfxFX4dQfy8NFbru54XtXQqFNbnJ9arXvYx5bGJ4SGwp9xWS+m7VZhMAAexrqrq4tbkbXkhhQj72efyrn7qENG6wShjnqelc1enF7HXTqTktR+kavqOik/ZJnkiHLxk/K3rxXeWPivRdfEUc7vp94q7TNLzGx9OMn9K8zYXcc5Gwk5xkDj8aVoY51DRssD5y3P8qweJqUnaLNvY0K6tJHrqpMGjZJ1uYSSmUk4J+tW5xJ5KQS5xjAyOD6f4V42l1qFm6GO9fyuuUfgfhW9onjbUrPK3ax6jbkgMrdQPqOldtLNFb94jzsVkbb5qJ0N9ahS8sZAk37skYAHpXH67a3Sy/ao0YxP0wc9a9BtL3w/4jXba6j9kuGwfInAx7gH8qhfw/cwXn+no3k44UgqD6H+tbupTxEfdZzwdfC/HE4CwuLmxaSJhjnJBXue9dJpF/KXEkMZjlK8HOOcjk1rNpNpfpxFGkxJxnPKjpnn61k+INK1FprXSbABGusybo2BO1QSRnsMfyrConQXMzSnWjiH5nTN8QbK0QW1/cJI6ptLR/MeKjsdc0nWUZbWWLO7OwrtY++O9eaXnhq/e6FhYxCS7kO1QXHJqCLQfEdheIVt2jnTBUq3P0rj/ALXfNaWx3PLG43judjqXhi+lv2jEO+KWQyJ6EgfpWPrHhW/t7SNC4cISxQZ+XNem+HPE14NEtZL5YY75Mo4dAGGDtOR+Fbt81hq+mT3LrDBcqhPlqPv+/wBa7JYelWjzx3Z5TzbEUKipTWx4OqSzQRpJcsUbgZGeQOlT2skdjrCXGdzRKOg4LAdPen3R8ma6O0qEmMYUDITrkism6f7O5CTNIGwUcjGSeK8WcWpNM+so1VUipdze0nSLvVr5VsiF2n52cce5/CtLVrKy0W2mNtdTTTyZhDgFdynhvwxmsqx8RTadbxxwRkTMpDkHII9c1DZR3+uXpbe0hjA2qzYxk46UKSQODT12KpstHCCJrlN4kIc4O8ggY68YHPenNpmhQoEuL+8G8Ajy1UkD86uXkJuUSx+wokSSFpp1GWb6GqjaHO32hcqkkT8MykeYf7voD7VtCtJhyUx02k+GEt4JotUunLMRJH5Q3qOzdcc9Ovaqctp4fjAxNdscc5QDn86obXhJ3IEGeuMmopjvPLFq09pMTjEt50RDj7PcOD1+bH9aHutMxhdObbjoZSOaz8U/yjtzkD601VkRyou/2jaIU8rSYFCHjLZz+lWYNeFuyvFY2gw2dhjBX8u9ZKwserKOex6+1XI9CvpLWS6jiOxFyxJwAKftpdyoposv4lu3mEjRQjB4AQYx6UyXWw6kNp1mxP8AEYwSBnNZPkunDoQf1FBX2NJzk+oWNWTW/OCh7K1ULwAqgUz+1I/+fWCs+OJXGSVPsT0p3kJ6J/30KjmkPlY2Oa2QELBu92bk0FprggLkDoFXpiodi9xj8KvQKCiCMbT6mvPbsXdIhW38vBZhg9lPNaUOnOQzAqDgbQaLSyUyklWYAE1rxqnlKuNozgcVDZ5uIxlnaBTFpMMBFDkAZ9RUkNlJEzTPG5YHBPbNbNrHDbWT3Uzchvk7/XNL/aQUNuKyxsc88nPtUNnnyx9e1rGQk4hyu0k55OPvU4bppEQYQy8g9cegronWwugGaBIcAHKdh9KntdO0BlE4u5NvG4Bfm49B2pGdTM4xjaxzltaO02Jyilj0rqrswokMUbFoUVSfris9rvTrItPD5k0ithTLyv4jpWVcaq0zukjqwYkkdMU7Hn1qeJx7T6GreSiO1C7+VHAHp61gXEzqSwzzT2l37yeM9ADwfeq7o5UscYB6k00j1cty90ZJsruzFsscmmKOfrSyHnFCRsx2IdzMOAAaZ9FLlhuSKeMd6HfaCAaY6SqxXYQ6jGCODVRmkLdCT6AZpb6C54NXvobOlCVldIgHDkKwB5x1xWtreh3Nhah7jTbiN8bjlThlI4/ka1vhnosTLY3EkUu65uQjbhjHPavptp9JezksLz7A8wjUeVKVLbR7VlJ2ZVOhGOq6nwjfRTZVYWwpOCMY5qxpL6vol9FdxMVO4MvGQTX0B8StL8PWVgktrp1pvlcsJYlU7cZ44rz61sotV0+8hKkvbr5qkJwoxk5P0qlUbMMZalT5pK5z015PFNIgQp8xDA8kVHuLODuyuOBVzxTbQ6frNxarJvCnknn86zFYdqszpJTin0HynJrr/hfLKPFNigQyMWIbBwACDya5FGh6yuApFWdLuLmMN9jklSU8IUbGKlw5jrUvZK6PoLVNK06APFva1muTj7Qvfnsew9qwtT/tG3g+y+IdPTVtNB2xzq2Jov8Aa9D+dcDpPi/X9Hf7PqcL3tsxAeO5GS3HQMfb3rrdK8XWE+2K0y0TcmyuyQU9fLc8fhmuqguVWPMm05OR0fhLV5tJs2XT5hq+jMcMoGJIh33L7etc18WvCkepRDxNoZSaF+HjUkkY9R+NWX0+3kuv7R8MXslldRndMrnZtH+0D94fnS3HjrSdL0hygB1mRWDRwAmFm/vkfdqpRT3Empux5Za6BczJG8jx26ZARZM5LfSvV/DEWnyeHp9K169Lx2gBE8fzLEDzsHfP4d68t1zxDJdSCK3YCYPvmIwS79zn2PQCqmiXuu/a0XTwzE5YqfnDnPdTnmuWrR9odlGbp6I7OfVfBGkztNp9lJe3BbCtOw2KOcnH5UTz+GPFFrc+XZGy1NIt6eSAVcKMsSOMHANYEPw08YXref8A2TKC3QuwX+ZrsfAfwu1+x1uC41Wz2wMcP/pAzg8EcHv6d6xdBx1OmnWUvdZ5Q8gRpE5TnGDUZbkADJOMV7P4z+EN/cakz6TFGIyoPLgc5PrXLap8Ldc0zT5Lu5ktF8oElVkDEY+hremtDmnTjTfunCBMyDBBq9a2cjMo8rzGY8c9KqxDMigZPOK6ewuYtMsWm/fJK2NgMYIP4mtehjWnaKsjMvXFpalPL2ydFIb+lc5NaSTziSXOB1yOla1xMZ7hp5TlmOfp9KgnlDR/KxOTitC4JpakJghS1YkY544qtbQecCxYAI6hQT2q47u6hMAbuGTOAarzA2swnCeZjhkB6r7VSZo4uSPsD4aXmjP4MbQLq2jEFzEADGPlk4+8D6irPgfxPqWlfbvDd05nm08nyC45lhxlG/AYB+leAeFPiQlro8VhDDmZfljf+4T1yOtdj4b8VXOt+LtNW1hY3SK9tPIw5kTacYz7nNawS6nl16dWMJcu57xD4ykWLbNGgbHLKPlrh/H/AI6ls9Ma5tys922IraNs/PIxwox9TXoWgaLH/Yuy7tYzI3U5ySPX614n8Tr2w0j4h6fZWVos0tsjSlZN2AzcAnPoGyK2fK9jzY0sTpKozP8AFVj/AGF4X+z3F2s2s3a/aL5yucs3RQc9AOK80tfNmcu6hz2UivRvE0afZZ7q5cyTuRuVF3ZGOvFeaf2hcLcTWmnZeRztUoPujPUntU2PTpyutSa7s/NUMgCOx+76/Ssm6slfd8vzr1yea2JIJLGIF5TNKpw77vlU+3rTEQSBnYKXfGSe9SaJ63KfhjV77w3exzxMZIGbMsDt8rDpj8q7XXdOtPEGkvqWhlJgMtMka48puuCSa4W9Many5ANo7UeHtek0TUfMXzHsZjsmiyduD3x6/WtacuVHJicMpe/DSxiak7xTsroFYEggn0rKuTHOeNqnGa9A8e+H7W5iXU9IYSWkyl4+dxH1A6V5m9jdJKUO7cO1Wnc1w04z66kjWpeEHB56cUkG6xuwzBivQ8dquaKZHk2zZK524NbUWmRSna7Aq3DHP3a1hTb2KrVlBamFc3IicSonBOR7VraRq4nUiZwGB496tah4esbiAvZ3LBhxiXgHHXnoK5+XRr+0m3/ZmcL8wZOQR9a0cal/IwjXozj2ZsX8TzY2As7cgD0pdF0bUb2eMJEI034di3T61Y8PeZPIsZjYKPvMy4xXb6JrGiWzvp8EJlV02O2fmz6it40U9TlrYtwjZHMeJ/LsNQC2jROojQsV5BbAz+tc27RTMwZEjL9K7bxB4fBLuDtAOBnriuSutOSNmSQbkGMEdfzrlxGHbZrg8VHl1ZDFazXOI15XoR6/hVltExH5kMmyReuRwPrXTeBNE1XUbnyLTTZLiAnmTGNo7ZJ7V1+o/D6DTwq3upxrc3RwkAG9gM9R1496w9gmjZ5lKM7RPH1HmMyg7bhfQ8N7iuy8JeJ557eHQNXSY27uqo5GWjOcDnuM/pVzWvCujaVO1zc6rAbiE5+zoc59jS6p4o0d9CWCKGC2RZECtCgEmSQSS3UAc9KwhRcJ3TPTnjY16VnG7PT7G28O6TbvaMRdX6KD5sijYAe6jPP6VyPxBuLESw6tGYbdeY2EZwAxHYe+DXnvj7xGBq0dro4T7P5CDzANzOecnJ5qhJeXOv6Ncm8aBbi1KgAYTK+wHfpWmLq80bHl4XBS5uZnTaTGk90Lm0YvghkJ6g9STXTa+X8iK7jhQSPt3Ox5PB7f56V5hot9cWJhEMxLONrjOMZ7VvXFxqd8DHJPuQKfKWNhkngdBznmvnZxbloz7GnTSpnXWnhx9X0SW7EuJ2kJVwwIBA4yPc9/esrSzq+iX8dteI85d9siMhwErFkn1PTbfS7fSmuJLuIv5wGcD5ycfl1rb1PXPEev2K3JDQfY3KOkb4cjA5Hc96+mw9d06SjbY+UxGBjXrO7tc0/EXg4X0v8AadiZjvww+XCv7e1YF34PuZSoutOuGIB2AAGsM+INWWIRtrV8VHG0TNj8s0z/AISLV/tJmk1W9AC7VK3BGP1rF4mMndo74YCVCCSldFy40KaxulY2EsajoXGQfyq/Y6DqMll9osLWOKfzN/mmQgkf3cY71k2Pi7X7KKRobp542I3GVRIB/wB9ZrTT4lav+72WNkiRn5f3a4NEHTlK8th1oVlBKmyS4jvdN01I5beMyqGwc8Gm+HmvtSKosSfZ5yHLrwV28559cVavPiW8sCRXHh2wfP8AEYhg1Rk+Ik5Li20jTbXI2jYowv0FOVSmpKSIjSqcmr1KesaLbwXkm5ZjufLNsPf0qHSvDz6lN5VtaTtx97oM/U8VYXxtquQGuBIMbdjxKy+vQjHeoL/XtUu4QguZIoyxYxL+7j/ADAraeJpuPuxKjh6lveZfX4eatbTi5u7W2W0AyzzzKFH5Emq134WsoppPN17So3JHlqjsy/iccVhyyO8i/aWYrkYLOSBVmO0jmUyRmNu3QZrnU7m6hbdmpH4RuvKLW+saTLGeSFmIGT9RUknhTVDb7l1XTVjJwv77OfbpWPPp6blUKuM8flVaewlEowU69SOM07NPYGl3NeHwhLJE00mr6SmOzTtkn/vmp4fBcssJeLVdICj7374jH6VzgSQyFPKGRx6Usi+WwM0KrjjLN+tPnXYOTzN2TwfbrgP4h0rOOdrMR/Kmf8Ijaf8AQw6Z/wCPf4Vk/aISMGSFNvGNmc0edb/894f++P8A61L2nkV7L+8ZcMKPGY2Vg5H6Vf02FFUBVLAckdeaYYJFkVIh8uPmrUsbeeP5/LPpwuM5rzJ7Hj4zERVPR6joUyuEyjMMbQKsPaFWBmbZg52qfvev0q8lzHBaBPIHnYOWbqPoKyri8R1JiOZRyxHr/WszxMO61Z+6gkzLJvORFuAVR6f41q6daWqRLKseSDu2ueM1jLK5kURsrEjPp9aWbUzHC0cYwB1INOx318NXqRVODLtxOGmOSUIBHymqUl68ayCIEsRgVnzXu5CwJMg+7x0qOG4lkJQljjkY/nTsd2GytRilUFuLmZpCpyR1wKfBDvDSsQCRnBPNV2b95v2g47tU4uGk2q4x9OarY9f2UYL3FoTRsyjrke9JLKScdsdKgbe55+7mmqZI3yACMGpbFJwWpbsrNrl8GQKB1ZjwBW5BrGlaEyiygjuJwP8AXSjJz7CqUapbaV5ZVhJN8zt/s9hj86z2sXnkPlxkgHGaLHDKl7ablOWhutrMWtXnm6hbo27GDEu3bXS6L4X0XdFfR+ZLGoJYSDhT6/SuW0bS5RLHGIyeeuzivQLmdtB8IXk7oivxhVbkZ9h9KcVZnyOZ1Jup7Kg3qa9t4g0R/FOm2CukjwbQEtxwo6cn6c11PinwxZazEfLUWtwOXvfMOdvpXzVYahImtR6tZMRMkm+VQ2MjPP4e1e86X8Qbe60mwt9OsjfahM+3ySQoGMck1hUT5j77Lqap4aMW9UcX8ZtKj0jX9K062kcQQ2yM6sxKyEY5NQ+EJLW7/tJzA1rZ/Z2EzRAnLYO3Gf5VnfE258Q3mvmbUY4vkchiMN5Y/u7h/Sqmj+NDoEAieBbi2lJDxnKg54JyKIHNmqlOCUTmdZfffynJPzHkjFVV3NhVBJPGB3r1m48J+D/Emlx6tp+oy2rXAAaKRlbYepzznH4VxzeGLzS9YijJWWEuBFNDyrDPXnBB+tdPKcUcwpQp26o59bOTbuUcjjDDNaekW4t7mKQybSDwGXrXpGmafoGlaiRcmK5m481R0Of4T/nHNanjS38ICeG409IkllP+pWPlSFJ47dqVjzZ5y6sWuxp+Ep9L17SltNRihfB2EFAD09al1L4X6BdQt/Z73Fk+cgAg89uCK83v9TvNNkS50yKaNnXJVhxuBPf1rsfAfjjWLzVDDqF5HFaLA26ZgAVbgDGe/NNy5VdGmW4t13yyOH1zStY0e7l0Rb5riGNjLPOvAOBnaT+FcFi6mumsYyvmzS8SHng/yFdB47vpxqVxZb5tqytu3ty7Eklj9azPB9rM1w1xGziUtydmcD8KunNzjdnuVVCktTvfAvg7UNOvZ7W50SO8Y4eK5D/KPXHHf+taieFrabV92m/aYL9H3TWMuN4Gc7kYYz+Vbnh7XYvCpmtNV1JWZlAjgKHCN68Dj6Vxfiq5+26r/ay+JJkuMExu5bCDPQEcgVouU5liE3oj6DsZrcadGzvsMa4aOYYfPGc1z3iHVGupRJZsRBE20Hpls9vp/SuH8EfEaRE+wanrkF2duI32nJPfkjmupgvY7gOqFlZ/nBzgSfhVWixe3jfXQvRXc4DfaSzSA9VPT8K83+Mevi10xLCCYia5YsV6HB59eldpq15bQ2k108ggaND5gc/ePoMV4H4kvL7W/EDXd1bzMD8kSgfcHoKmUUgdZdyppdtJckHcqgdcjFS3Um64IBbaOEVmyBV+4ulsNOFtDPcJPMSJY2XAUYGKyGyUICfOwznHT6VEdS6cubcYSQCoOD0pN6KQDtHGAD3pBBJId8akqo546V0HiLR2/tOO1t0fMMCqzAD5m5JP6j8quxUasVuyho1pY3t3HFeCRYVVvmi+8WIOMn64rRn8Gao1tESvltMxWBGGGceorItY9WgnItbJ55zhVCrgHHqO/Fe3fDvxlE0dpa+IdIfTLi1XENy67kT3HvnnBqorUipi6cFdM8qPw81OSRF+xyxMnJlBwTXR+E/D+u+F9ds/EEUjXkVtKH8ib5SyjqM+p7V7VZWEtrYRQCUahbeW73Fw7ku54IC1ka9pYexR3UjzgG8sjLgep/Cunlsef9dcmew6D4q0jV/Cx1y2lEMEUZMwc48lgOVP5180eMdD8WeN/Hdx4n0IwRWjAIJLgld4AxkD0OK9I+Hlk918CdYMcjM9xPIxDjBONvBz9KsaVN50UF1hrcyIC0PXkjO32GeKqKFicY6atbc87tPAlzdYbxDqlzebekNonkqR7sS2e/pSNo2maXJNDY2qQkR7dkQyxA785zmvSkmvblbcxRrbwLvSZZ/lcc8YrhPFGs6boFpb3UMUuravCCkUoTLjI6t9PWiSMYYi+jdjz3X4/KmjuJWARkLNEyYKnoM89eh/GsN9XsUdYFkGWOOD396zdavdYvru5lvLWVxO+59wYBT34xzVTRrB01i1lmhDxGUFs9Oay2PWi6fLuXvEYMS/aDMXL8YA6VSLl4w6crnDjsDgVo+LLaRb+4tkRwkUzqrNnkAkcVnRoGCxHeEdMSYHFJMhOOx1HgXWo4WbRtRV5bG4B2AELsk7HPPFWdZ8NiyutuBsLbuPmPT1rz+Tz7WZgpJUHFex+AtS/wCEk0JYL5pXuLSPYqZCqRj5T1yfSt6D97U83GQdL95A4R9KgZpFJ8iNOjFevrVeJreMGFndwv3SBgtXpvivRriCYi5hjWPy8hozlWHf8eleY6xr+mWcRt7azNxcAkec46YPpXf7WMFdHNSqSrmo9nBJA725bBAO3Odpqru1S102QW87K+8NgqCMenSudg8V6mkuYlKkjHDdavr4uubhmZolkhfG5G5Kt6g1McZA2lg6u9iK+1fVJbdrWbgOeqrg/Xit7wNpCR38dxdyqu/BUH+I+tVbIW2qwPJAwjnX78Xcr6itDRJLuS5ht0s5Z2ziMIMn9eldNKcU+ZvQwrLm91I9R8QWtrqOlKVZEYjLlCFGR379ax/Dfg20nm+2alzaZzluA+O2P60ybUdL0SNJdVnS7u1OFtYx8sR/2+1ef+LviLf3N7L5ExA+4hQ4Cj2rlxOOhF2NsNlU370tj2nVvGNlp+NE0e3hW6lOyGGPA28ZJc+mB0rwzx7q+p22u3EM2oST3LMFklThVyMhV9AM/wA6x9H1LUv+Ekg1W0t5j5DEy4PLDof51c8UQzahqsmqNmBLhgGWTOfQZH0rk5pS1SO6NOjCVhj26y2ktxcSsX2g55JJrInjCx4D7gzZPFXGWe3gKlpHRvlORwBR9nZHDOVIA3fWuetU5JqJ6uGpKrBuPQiWADdcMgO1eM1DYy+XOrSMFwTu4q9cOsiJErllJJA24wfSqk+nSxyCUY5OevHPPSqcW0QqiizY0W4hn1W28mzacxtkhe/Oa7e41W2t7aV7XTGjuZAZMFMFWrzvT7iWxlSeKMEk/wB/aR9K3k1SfUmJuf3WV2gAYwK5o4bmkaPFyjBpMs+Edctotaa4vZUt5BC77gOS5U+vHJq/DJIt1bWiz75p70yZXgFSB/Pn8q5awgiBKsEYxSPneDkgEkVo2twP7RgvHJ227b9pA5x2xXTzqM+VmM8PzUnU6m14w8L2gR9Q0+EW6h9s0PmZ2H16dK4v7Jh2bchjXIJ2kgn65rotD1i61HxLqKxA+RIspkXkr0IXj64pdEsWuI5NOmkOJwQ25eAe3NdkMMqmyPLjjalCPLUZy0iSzYRUd9vQqflx9KLbTdQupwkEMgJ69q0bi1nsL5UWUJ5WcKDipbLUri3dJNzYzhsHqCaI4OLlZm1TMn7O8DE1DS9UtX2y2Fy/YshyM/lVJrPUVYF7d9ncMuCK9hsdatZ7aMyypGw45PWrLz2kjf66OTHGOorf+y4vZnmvP6sVrA8XNtdOAsUE6gnOMVbEd3CoWdJTnpvHX2r0y8vrOOcIIInAHytjHNZ06LPPuETKrKflHT6ilLLHFaM6aWd8/wASscUpVlAjgkicc/NypoAn8r/UMpzyygj9K6LUdbvFVYyItqHAO0A1TbxDdPOUURkHkZAGT6VgsHNHpRx1KSvczVmlVk+yyzMxXLBl5B9KkV7xlJaOdSeAew/Cob/WbV3LvZpHKjYO05B+g6VBDrsqSf6JJPFk9A2P61lUpyhozenWjJXJVjmlcJ57gE5yVxinf2U84ODMxx1xwee1aVjrCyts1CCG74wTuw4/4EKuzatpttH/AMS+9voCDzH1HuM5oVFtXNPaR6HKyaVIrYRXx7imf2XP/dP5VvyeKMHE9tHN3V2jGT9ab/wlFv8A8+EX/fsUvYi9oVUmjyWcEY6Y7Crkd++EUFyQwAI6Y61lxRh/kDYz2Petmd7S30giJStw4wSB0H1ryZao8GtTpSmox1uU7uQTXDTlsbuOSapEhABjj0qBw5f5WZjjqT2p2/JyRzSSPVoYWNKFkWEcMp3EqMfKMc/nUExOQrAAHOQKSSdtqhT0PIxUO4sxJpnRQpKLJo485+ZfbNSLHgFhIBk8nFVoy2/g59q19Ot42tzPcvsj3bQo5Yn6Urjru2iIIbGWdXPRI/vOeADUUduI2IeRRg5HPWpyxYuSwA9up+tOWASTIOqt1PoKVmyVOewsiW8e1QwlYfeI6CrSTLCd8FrHjbjcRu6fXioFtZOQqnAfb0zurfi0200/TDqGr3H2eFSQkfWR/oK09nbc5q9aNLzMUy3V/eBlVpJmwu0Lx7cCum0zQLj7Z9nurm1tm3ZCNIN7ewFcbf8AjNopHi0yNbaHGFC8u/uTWVL4x1mJpIiN8T5yk65P4elWopEzpV68dND2PUvEGmeG9LVGUNcsdpjIBZT7/XjpXl2v+IdR1e5LO7RKxICDjPtWBa3817cIsjO7dAuc4roINLkcZLZAAJ20mkLC5XhsMva1X7xzV5PLHMj27sp77f611HhjX5tNWK9spRHeqCp3EYFRX+mlZJFLIoPzujetVbe2jIDW0p83up6AVPIehSxUZK6N/UNdu9VuSkyokr/eMZJVj9M9awfEET7R5hK/7PT9K0dJ1iTSxIJLMM7ADeTis/U7mXUpjLcFUUjG2MYAGalQN/aQ3kU7Ce7ijKRyzoM8FSeK1dN1rVrUqv2iWVWkABY8g56807TbOKZ44LdZHklYBVHGSa6vw94JvbjX1sZbaVXgJadHwCoxu9fSrk1Fann1qFOptHcqeHrHVNav5GglO9f3jFjg/l3PtXc6D4P1m82Xk5BBchSxAP412GkRWXh8pp2jWe75A8s7YLYPQZ7854rVhS6v52+0TvHsOWcHGO36ZrnnLS54FWphXV9goe8ZUPh28vV+w3VigVVCmVV+YEEkZ/AivD/ibqo0XWX0azQB4JD5pP8AER0P0r2Hxp4ru9J0aSTTbmScxKT12t8pPpnrXlHhPwbrPxA8Qf2vq4a3smf9/cOM5B6Aep/KlSTqaHq4TD0sE71FZkXiTSr7VtW0FbSEzXF7Yxu69yxHJNdHCkXhLSy13ZhZ1fbtY9T68dq9v8PaDo+lm2WyRJRBEIo5mGWwoxz+Iryn48vKLeVrdUYvlUbZn612ez9nA48XmkK2IUb6M4A3Oq+JLuZtNt2uLq5kYvnLeWM5ByOnQCt+w+EvirUo1nvLyKCFh+8A55rY+E1i9hp1kqMJJZIhLM2MbdwyAfzr2TSmf/VJLGBsBbecc/1rzqlZqdj6mlRh7NNHjcn7Pd2bMz2et5ZFJVAMc4zwfwrjjqur+GLttK1ya63wkKkhJDpx+oxX1eJGWDep3EcNtrxD48afsYXqwxuHHzF/4j0/lWka0kyKmHhVi0yrBcDxRZxWlrepLMsZdlJAf8upFcVfytp1zMl1ctFPAx2qU7jjGawtE1uWCVIBM8cMb5iIPMZ74PpW78Ub9p7e0AmSaOZd7FST83c5x39K7lLnSPCnhPZ1LNnJXGpyXF1JO7lndskk5rR0oSTzIRkBVIzjt6VzG7mty0nNsIyrltw5OO1O1j0I00lY1JryCK3kiUNnPzsfrxTbzWtSN4+pIAY5TyvXtjnHSsuaRDMAcuueR0yM1YtYruF4HtGKyM5CAnnH1/GmkS6VPqX9C8bXOlagl2kaPtzuG3oDwRg/WvQrj4ueEf7DeAwSXMz4LRzRjB9fmAGMVwM+jK0kb6jpkiRqCHkt8Els9SO9SWnw2g1WH7Rp+p2e5icQ3OY3/kea0SOGthKUpXLEXxZ1ay1l7jR75be2KgLbOfMUnv16V2viD4p+KLPR7RL7TbKO51K1Pl5zkKcjdjORxzXDWHwr8RR6rbo9pb+QGVpWWcYUZGa2PjVeWU3jBYIijR6ZaRW0TL/EAoJz69au7Klh6aS5Ueg+HPFXjWfwNDLaWFmLGGBiyLExDnuSQetcn4J+LOuvqq6Wmk2dxcESCF3LdFBOOD6D61reCPFNvZfCrVsqTDDiNsH1BwB+Rrx7wrqkEHjfT9Qjxhb5WO4cbC3P6U07E+xjUXvI7HXvjBrd5qBnvJVjjil2PaRjaCB15PNdT4f+NHg+O0ijuNGkjZlxIWAfnHc4z1965f4kfC7VbnxZfalotpCdOnYTI24KPmAJ7+uawLj4X6rZQCfUr/TbROMjzizfkBTbuS8JQe5r+L/iJa6zdhLCxhitowVBI5bPc965s6zeX+1Y4kUKQAQMLx71LcaVo1o8f2H7ZqIxy8yeWhYdRjJyKgkNzIzxyNHboimRYfuqfQLWeppHCwhrEuyajNeyujhULsWAyf681Fey/ZI0QOpfbk49Peqonjhj+UOmUA2hs5NZl1cPM5JOT0J9qpI39lAsS3xli/eYyPatTwv4juNMu4JYGHyuBg/1rm5SdnAzTLWIyybWbYMjn0qloZ1KEZQaPYviD47F3oIghMW+YAFl/hx1we1ed+H/AA3qeuSExKWjYlg+KdcQMxSLCMFXPHTHbiu1+GTSBXaJlwpwR0/CsMTOaj7prlWEgh1n8GdTuCjR3UTIwwc9jTf+FJ+JIpJdrQrGpKqf71e5+F7iN0iDOFJ5b2roZZwtu0peMLgnJPTPH9a4IVKiXvHozoq+h8hnQ9e8Magk93avGEfazlTzg9K3b3xXd/YWvLGGKxtpMxAxY3k8dSefyxXrnxCt47zQbyAKkkhUtkdhj+deB+GrCR5r7T7oHAPmA9w6nA4+hNd+HqTqrkucVejRo/vJIyL67vLqUhFkkDHDMSTn3Nbeh+EpLmzGoTqGRCMr6Z6fyNdLptpZRQiKWNcE54HzLjjium8N2Et1BcQHfEjRMI89z2r1qGX8rXMeNi81nUdoaIXQtB0+y0t5fI3ynACjnk+uO1bVv4O0jXYAbsBmQbv3Rxz/APqrhm1zV9FuhbvERkE5JyPTBH412vgvxS5zC4SSWVd25RgLxjH5ivfp4aNtEfPYqFWSc0zA8f8Aw8sobZpdPu5Y2iQyOjkEHHavIVvFNt8wyeQuexHFfS3iOaObSRemMR5UsQv8Ten86+evFVvZpqDvpx+V2Mjr3DY6/nzXz+a4Lmqc8T2uG80nSjKnMx7SYhcb8jP3T1z7Voi5BALd/Wp9Ltobsj7ZAq7kyGT5Xb8Dwfzq0uladggXmGHzKJFwfTBxnHWuSDktD16tVX5rGaZlUfcH/AhTVugp3dR7VpXtpaKq7LiKMYw2/PzH2xVUWNs4MrXiCIddoJJp7MiNWL1G21zFLePIGbAAUk9veqV7qM4llEakqDxkYzXUeEfD1tq97I5aYadCudzDbubHFR+LPB5tb1X06CaW3ePqTuKsPX86UsJNr2ljR5lTbVJFD4ZXo07xFGJl8yG6zHLk4xnuPfOK9C8Q6TJZXsiwI5J+YNnsQCOleXaZaRvqMFrJcrEIvn8zuCB0A9a9a0WZNWsrbTr9il7EP3bk7vMjJ43ehrrwOJjCXs5bnm5rhm4qstUjn9RvbeW2B1ewieYJhpB8pb8vSuN1qCXSrlWRpPs8ih4sgHK//Wr0vU9IYgrIN49T1Huazb7w+bjSGtpA8xt2JjZh26kD2zXs1KF1dHkUqvL6Hli6hKbnCMxToOea29NvruOFG3yHbnqOSOtE/hwQtvUNu579KtabH5JjEikrgqc/SijSaWp01ZQktCpLqd0ztMBkqMshHGasw+I3XyztYcZK4puqW6RwtJGCR1yRj/POa5yUhiSV56/j61tKOhMIRqaM6WTUrKRNzhCTyRnJwapajbWs5L2vX+EetYiEMQCxY55PoKsxyPAcJuI/nSikuhcaXLsyldwSxyHzExzjp3qse471sXEztKTKoLZ+U59KptDyGC53ZNZVKCk9DqpVWlqQxJceXujJC/WmLLIoIDtg+9W545UjwPlGM/WqNY1qcYuyRvCrfZkqyygcOfxpfOl/v/pUOaMn0rn5I9i/aS7nVSzKrkrtXb0+Xg1WubnenmAqcnGM5JNR3NxtjVVIyRyPSqeRXytjuwtKMI3a1LAmbGAOM04qX5AO7+6KjtVHmb25Udake7CDIwHHTHb2osb+010InVgxVgQQehpyYGc96GlgKZ+YyN78CnQOhbbsznke1Kxan5EsSqreYQcEcGrMchc/KmTnoBULyNIfmwMcYAqaEYTfjviiwnG7uMcHdIwBCntzgGt/wwr3RWN4493TJ4rGmDxSGPks3bHWul8IQBLgTXha3t0XdI23jH+PpWkGou5z4rEckbLc6O4TRdB8PjUtQVWmY7raMdZT7j+79a8g8W61qOt6kZLq4LTyuMBeFQH0A4HFavxC8Rvq2oyzKuyIfJFHuztUVneCND1LU9TJismmZkKoW6cjGadWpzammCoK3NM9j/Zy8D6Nd3b3mrWkN0Y1BXzVDAn1wa9d8d/DXwb4lR4W0mCFxkRzwRrER6E4x+tcd8LrXVPDWliG/SNVUEKe30rom8UkW1w7y+YuMHaOlee6srnrcjkfMPjzwnefD3xI9ux+02pJ2yAZ3oe31roPDV41pFDffZlvLOYbQFTduJ/hOOhrV+NV+mp6L5jje6tkD+6tch4bu7aLwo0duLlbtH3ko+FA7HGO2a6KbbRxYuhCpHkkdr4q8HXllpP9sXlk1tDP84jCFigPTcRwPxrhPP0xLWRIoClwed/bA7Y/GtnTPH/iPTdHv9Ju5VngnXafNBf7w6jnjrWMulSS6Yl9vjBmOI0Q5Jq4Sd7M4aWDjS+AZaKVhBx5iEcE84FFwiBMIBndwcVNbkRKsW0gDgMeee9W47ea6uUtUjzLIwWJVGc1vaxU8QovlZh2+qXOm3ouckPEwZAvY9q9Wi8e208tlMkCf2tqNuIroliSw27QcdAelef3WiR3N9BYlSZGlC9ec96hvdFePxDLbWMojMErFpmP3FU4AP4CuarDmZ10qtqfMe1eH9Ye21AaTqelyWcqqHEyMSoX1JPb/Gr3izxLD9otodOu2tycSJc4zFLnqr5479a8k8V+LNT1SxttHsZEWKJAkssQw0n4nPFZ/hvUL+0nS2k3XKkBSjtxiolTk42OPD4ejTr+2e7PTbybypzdXlnbeWTktauHDt7oM/niuo+HMsk2iTqVxE8u1FAHOPb8a8x1efTNPSV7yX7NLIoMKrJkKcdRXrnwvihXwfYzo6nzBkZ649a1wsbGHENZVoJROnQRWFmvnONwU7M9Bkfr9K8g+J2oQ/ZGSSQoSG3FRnPTH4fWvSfEbrMrR27q06sAe2eeK838e+Fr2WzeKZlVpgX25yMj0rprfCfCRmniopPRHFaF4k17R7+zazjF5bzLH+8EW0AkD5eR0Hr0r17xj4S1e+05dSstRmgleFXMMZ+6SOvHavO9IeGyg0yO9mQWsCI7yBeSoHAx3xxXtuleJbfU42i06OeYGNQpZAExjsc15LWtz9XwdVTpLlZzfw7sfE9hGy6hLDcpkKjtK28juSM4q58ZtEXUvBV4hbbPHH5qnHoOfw4rsLIxW0BlUM+eoIxg1w3xR8SLYaHNG5Hnz5VB+mKG9TVo8A8L+BNU1TTbjUoJB5ELkZwSSfw6fU1elt/tnhi4s5/luLR9+1vYEHB6d817Z4UFpYeCoL+F9kLWrNdA42ex+tePWyzarYahMECJcysxfHEWSSAfwr0MK+bQ87MOWEFI80yA+egBq3FM4UJjCnpzUNzF5VzJGSDtYjI6GiNlDBWzg9D6V0yIjK8UXU3bgpySemK6DS76S30ue2mhWXzCAjZG5PX6dq55C7bWhK7065qvPdTOjsZJJC3A5wVpIdrntfwdaxvtOfSr8eTIzh0kYkO4znAPoeleyR/CiHWNPvppZ7WM3SgW2IhmHAwecZya+U/AXjF9E1S2bUd81tDxGR96M+3qPavdvH3xzhsfA0MGgXYk1O/hIzGeLfsX9jx0rVHHKDjMyPiVpfh+y1y28IaC1xLfw/Nql1FcPiNFHKnBxkmvFtat57i+uUgLCDzSE+bcSoPHPU16N4Ft47HwBrPim8n8y/ufkDMSWJPXP1Ga5SOCKaJGBIVwMc80ykxNKDp8PNbsBvzJPAeTgdH7VzljpRgbbs/eDgE9jXWfZnbSL9I2/dLNBvbv/HgVJdWMdk22TA3DO49RSKUnax1XgqTQU8Q2Om+JXvfsOoxIbSea8l2I2SpXlumR3r1TUPhNBYF7mBrcwtL5m+VRIdnPygtkjtzXja22l+Ifh48DXUY1Cync2pZ8cAAkf4V1vwa+LMb6Q3h3xTclbq3jzZyvJtEmB91ic5OP5UzKpBuOhyXxNtk0tjaWiI6u7hFUgqc55Hoa8+l8xtvm7jgYXd1Arpfil4wg1HxBJJpDjcow8iphQe+0f1rz6C5uE33CyN5iuNpPPXrQVSUuXU07vai5Y5cjGPQVQfGML+NSyTTTvunZc8nIHJNRP37U0jUTNJGSsg24OWzz0oUA5y2PwowAw+tXYiT0sdMhkR4JV+USqAwHNastnqKTpb6dFcMXQFijGMEkZPPHeqehqhsrOTcXk8wFgRxgev517D4XmsIdRlinKSI5yjEcAnnrXJitIkZbNqo4nEW9v4u8KyQ3Z1N57VwFdHkJC569e9dV47h8XT6bbyaHdSlPKXzYhj5mPPHemfGDUorGytVZXFtI+QUX+Hj/AOvXReCPE+k6zcwQaek7x+Wv7tlyVAHc+teffQ9w4rRJfFdneR2t7FJMHA3t1QA9evORWV4V0m5kuNR1K7JkneTEYyPXv2r0/wAc6zFZ2k3lRoAoOSowcelZPgGwf+yHaQKctuUjndmvWyXXEK54udzUKDlIwbjTN26X9zbtGwJP94nrj1/CoJddltZ0gtAq7OsjEdf8K73xTYwXGmtlF+UbScc5PQgfWvOIdElkvWheVH2kB0Tllz0zX6NQjSkrtHydGpCrq3ob+t2Mes6Q+ppEPtew+akSDDnIyV/rXG2T3Vtfwpalt6cFSec+leo6Na3NoIoGYFYFwvGFPaqXiDwn9ombUNPIhucbvk6Zq6Xs1dGNPFU1Jwexz2pza1deCZooY5JZobj7uCDgjv8A4V5tH4R1++uDmyuoV3HLeUxUc+oFeqaJLrWm6kbS7DJbOSHkdcg/Q12aQpbWLgyM0cgwiYxn/wCtXn43CxlLR6GaxDwjfLrc86tvhtPP4YKX2oqXIBj3DmM+3cfSsZ/hpqsMU0EMxujIuVkVSNuD1yfWvaLSGWZUiR1CsOV9MUs0E6OINxVf7o6Y9K8/+z6S6kVM7rp2SPDtP+GmvKqR3pCw+YGLSHO3/Irpz4Mis7UxTW6SO2M5UBWx9Oor1S8t2+wKrsRkYJBrORXlfaQGVegK9fxq6eCoxlfc5a2dYq1mrHmV8Lqwi8sRrHEv3URMDHbim2mtfuGR3jyXw24jr6V6Jrej2t1FmUraMV+VsZH415l4i0abTbiUeWZIUbgKvUHvmvQVKnayQYbF+130Zl+ItK0y+kkuoIlhvYz8jKCAxHHTpisrStVvtJupEvC8MuQ5cHLP6YPtjtUn2m5AKz5APyqpNZWt+fcXK7QZGK7UxxtPrXzeb4NRtUprVH1eV1ZTg6NR6M9Ktr8ax/pMbB3c4bB/i/CrO6YSq6M8Zg27gVyDj27j2rifBt1cIs0ReNISclQp3A9znPStm91qKL5BKTEx5I6k4r0sHOVSkuZHDjaUaVVxgy9rWkrej7RYMgB5kQuAQfUZ7Vy1/ot3az7HTYSMgK3BFakHiCCZUVlCNu5J6MD6/lW/FOl5bATRo6huAPT2NdiVjj5pI851GNkgCyLhyu3H41ys0UvmEA+2K9X1TSPKfekTT28xOCVwVPTFYcmhQn5igDEcen0zTdNyNqWJUHqcLDEYyeoyOho5EvHHHat3WtLaEFVA+QAkL3z70610SefRjNbqs0it8yAfMue/uKydOV7HWq6krmTbBZCElfHUkkZ+lTGbyWjxCqqBhlbOH96huLG/hf5oXDITu49KpS3LPncxzRzqGjNFFT1NqfV4j5g+y2+1l2iMrnA9Rmufm27sqMH0pC2Tmmt0rmqVlO50QpKOqGmjNJRxXKalonAyOalijLAZ+tPWOODPmdeaRJW4Cgexr5Q9VVbpsklkESCNeGI5YVTjTAGSSR0qy6KSMnGBzz1NR7TkADPNIKUtGSIF45wD0qVcg7h2psSsWAVc/hVpIvKBklwB2FJmqmgG5vmb5R71Zs1nkkzvQgfd5xiqm8TMFHy+grW0HT9826VSUHUnpUmeKrqjTb6m54f8NanqE4lgDyeUNzMp+6vfmqXjLUY7WE6XaCSNi+6cb8hsdBWlrniE6fp7WOlXHLqVkaMkFR1wcd+K851Odp0fex3kfMxPJzzQcGAwtavJV6u3QveBtJXxF4vsrOVPNiLl5F9l7n65r3P4d3EVjqmqyW9jsEUjRptTKqobGBXn3wN0uZZb29jhkMvyRCRRjAOSwHvwK960LTLTTBO8yiO3k+ZVHr15981z1pvZH0cIlE20/ibTZLc74imSCOoNcLrGn3ehabdmed5HiAIAc4Az3r1fR72305ZJi67SxLHHQV4r8ZPEivNdCL5IpWJkI4yR2rGnFykbSklE8w8Wa/cXji1Mh2sMYXgDn+dS+EdSSGJoJMYPU9xXNxbrm4edzgHleO1To6liAjLL6r0NepGNloedOakdrLp2nXLExOVQ8knODUcIsdLVpG5cH5RXMQ6hdFAjuzY6Edqjup3mAyzE+hNVcyuaNzqirffaEcAs3KnlW9jWpBrUUd64t41BKDcqjIDVxkltNNKiRAjPXNdVo2jx2Vp9ovZNg+8VX70n/wBakzGVCM5XZ2Hw+sINSvLvWtTlhg0+xjJzKOJGPYev0rMvJW1EXEtrCsOmq5LMEwXXPGcdTVbSre512+HlzfZ9HthvkXdhcDsfenPrD296ZbIbbYkosW3KtHnHI+neueW5nUquo/Zw6GY1zEilraBUXkDPb/69ULqdfNjMwDIMZBOM1vXFjbTRrc2jYSYt+7J5DDGR7dRWTc6Jd3mpR2qwSIDnGVyOlDlYqGIhTVmRXOl2N3axtp0dy9zI/wAu1TsQZ5ya+ivANxDY/D20sF/1yKMsPpXnfh/w/ItnBZKSqxKDIQMYB65ruEt0s0jhSQYA6A1vQSsfCcRZzzxapouNK0k6zgtuX7yk8E/hW1HCuop5UsW59vO7nj61z8G4YABwf51vaTci3jVdwAwd5IzXoUqalB3PhKGKqqopNnk3j+1utGkk0WGBXa5kxC+CflJzj8K0fA/h/VlKpa66bd+FCLOcK30rZ+Osd8mnWOuWFv5gtW/elR90HjPt6fjXkXh3xc+lam2oXAaSQvuRASAv4d68atRlGpa2h+5cO14VMOmnqz3u48X3WjaJfWutyRm8gwu8H72e9eEeJvEFxeXLNcyNMrNlV3Hj0IFReKfE41q6luHkdpZOig9TXbfCn4Vah4iuYdW1pWt9POGUYw0mOmPbioVNbntyq62LGv22tJ8JtPaPUp2gk+Z4R8qge/qK4bR9e1KyeRYJBCzgrlBgA9CTX0x4u0G1utCbRrVGREhOzbjII6GvlHV2ksXuI3BErZTBGCpzzXThepxYu04pMxtTeV72UyS+Y5Ylnz1qFM85NDqRIc8+9AyBk11MSVlZEsUjR9MEHqPWrKxI8iqEXJ7VTBB4z1FXrWWPcmcE4oQgvrRYpogB/rD1rbtNAZrYbHWUSYPAy1UtcQG0hcSAA/druvh1eQRwxPMqlU4YEfr+NUjnnNIr+CtUXRYp9K1BWks51IYMMjpwPrWZFpmrfajcaMrtDvJETZ59hXQyW9veStJEVCs2eIyfXiuz8FacXlhjUoHfHy7sHrgY+lUYyrKK2OCsdP8AFbeFtUabw9d77iaKSNkjBA2buv51zOuWXiC+dH1M/Z1bkQq3JHuBxX2bp+j3EWiyaWk5dQM8r9323fjXjvjvRxFcOjLEHBCsoXLqPr2ppGP1p8yVjw62tJ4QkMeV3cHsR9a0BoL3USpJtjJyQ7j2/SuqvNOt4Y0YswwcklMVP4uv7KHR1Sy4YxgM69zjmg1VZt2R5WLJ2vWtUO8g4yvekuYfLAixjnHXNX9CYGaaY8tyQTVW+cPc9MYGfxoOlya0KroqKqAcgYNNAyeTgUsjFsnvSqwDCqRm5aCOmM7eQKrzNucIAc1K7lmPNNUbQWwc9fer3M1Lub3hWdhvhEeWYrjPfrkV6FoF8qM9vLNls70HTIB6Z9a5DToLLSI7G+md3dwZJAMYRccVnyauq3O9QxBO5GU8A1y4qN4kZc28Q2tj0bXrfVtflifXrlItPgHywksFUfgKvaXoX2Z3vfCt+Y5+GdkkcIx/ukECsPQ/iJZW3k/bIFuSo+cHG0nt1rodT+KPhuYD7DY+UyniOLCgnHevNVOdtD6BOLdrkuuXy3tvb2V2xiu7siCRQT1JwT+tekaLpVtY6RFa26sqJgEseTivPfh5oV5rWqt4k1RCPKy1tBjgd8mvRI1a3kjDSb3wcqT1r63JMGqceeW7Pz/iTHudT2a+FE81lDNCYpE3L/WstNEgjvzcmJWJwM98DtW6jhox8wJqSHlx8hfHUetfQc/KnY+eV7Wi9Cl/Z0M0K+dGAwHBU4PT9aoajLa2jJH5uZI1x8hwfXrVvxVeNbacTESpx0Xrj1968T1zxJctFJK0j+duKqBwQM9vfNeXiMd7JXPTy/LJV5Wex6TN4g0iRfspm6nq2eMetVI9X0drs3Uk23BxuDYA59K8jtUu7qQeUTHKVyyuxIUetdZoHgye5dJ7vUJ9jsG2LgDg+4rip56k7SR78uHU43TPWbCe1ntvtNtIZFxnPIJHvn6Vh+I9ZSzt5JE37yOCR1J5xntjr+FYl7pOteHNThltryWWxcY2SY+U+npiuN8Z6vHLO0bXZW4W4HmR7/lwOCfxqMdj2qXNBmWAyeMK/v6jLvxfqxZ2a/uXRcspUsY42HYj0PrW14A8bXd7LIl5DuMXO8YAP1FcLPdW8d5KqYSGUYIU/KB05qRbyxiu4ZLdymOHccZH4V4uHzGvCpdy0PexmT4etSceXU9oun+2rvdiYm5x2HoK5zUFvbZF8m5c7ckRq+Bj3HpWh4cuIbrSY5bS6NxGq7JWA5DY60y/RdjsqADqzHuPT2r9Cw1RVIJo/LZRdCs6b6HHSWba4JYXt4VuMB4XUBWbuR+WetZN34cuoY5JJUciIZbnkV011ZTRTLNbq6k/OCOuOoIP6Vn6i2oRSJqpdgCPnQsCCRV16SauetTrNJWOct7xLWPd8jr39c1ka9dvdTFo43i3KCCH6/lVzU73Spr1YktbiFS+SqsD/SrF4iC22Pp8cESE4kJIcjqPbp7VzpHbpbm6mNpkMiL5wKthfmDH9a19M165sk3l3ZMcZ5APris97iymVY0ka3XoTkEj61VNjNFI6uzeUwLRv2I9aoqEXP4joo/GssUhiBIikI3jP6/Wrdtdi5jjlt7yI548t5ANv1Fee3Nqd2EZnX3FT6dZtJIRu2uOueAKXO0OeFp/EtzvdXtpJ7FJ0iPJ+R+wweeRWcqTWkRkinkimaMqxDkE+1UtK1yPTY5dOu5HuLOTglWz5Z9RWjdwyQBGlVJoWTfFMjffH+I9KadzF02jnJjfQxSmOR41biQBsFh6e9ULzTk+wJdiVGJYqY+Qy4A59CDmugubm0KtDIg3Hn/61UJJLZASyCQLyyN0IqZU4s6ac5XRyzDB4oPNdDeWekXlirWMV1Bdg/NvcGNh6DjP61kSWFym0GMrnP3hgV58qEuiPRhVhbVlQijFWP7PvCTiCT8Fo/s69/595f8AvmsvYy7F+0h3HB1ch8EgdjTwHILBQPTio0Cn7p5P+c1KH2oRu5/zzXyLPRqzv7sCMOxznHB49qlRgpyp57VC2WkAAOc/nU0cZJIC8465pNnQo3VmSZbYZCw45FOjaWUBSdwPQ05Ld2txk49eOgoS5SHcsK5OMbjUsqLi1+7V2XLW1BBkZ1QKMHnk1LPqqwQNDbsWDcE9M+1Y8k0kuN7A01gSaRrSwCm+eqOmlkZThiGJzn3qrJHvyBnJ4GPerB7+1M3bGDAcg5oO6SSslsj6X+HukweHfAlnZSXCRX0oE8+37yhvT34rU1mG6aRo7nUZ7m2EPmQYXLHHNZXh26tPEWm2Otq0cbXMQgljBBKuB2BrJ8W/EfR/DypptxK17qEGVTyCNoX/AGu2fauSom5WQc3LuYeqeNpLiG4SECCNSUxJ14ryXxfqUuqXLBZS6g/M2Opq34m1RNXupZ7a2NsszbnRWJ5+lZUKbcApge4rohS5NWZX9rexW05GEXzjIByParUYj83oQfpVtY/PKxwQsXHACL978BUQtbjGHTlf4WGDXVGpHZnPKnboaGmWkdxP5aQtISRhU6mrwg02OV4pojFIuRu2gHPpwah0T7fp1xDf26SxlTwWTcG7Ypr21wHNyImaZyW28nBJ61HOjPlZf0+LSNPt7u81AvI+B5C44PPU1nPfzardrI+BCpwiFsDHuKg1CO6kto7u5A2tkAk8H6CqULpFMBuUCQYPJ4q4u5nUT5dDsLY2ieGJIYisczXAPBx5i4OT9Bx+dZDqWJXHJq7psMMuieckhbypAF9CDnJ/QfnTFG4kgfMOtc03qZ4CKUG+o7SL+40qWRo1jcSLtZJFyDXTTfEzxAEhitltLaJMKFiiAJGPWuW8sNknP9Kr3ChSGwMHkY7CoOueHhOOq1PoHwdcW+q6NDfuQ9xgq5I5J69fxqDUj5c0ltsUr2C9frXnPwy8STWN4NNd8ROcjeeAK9T1CJiDJjO78cVpSdpH5dxDhXSbSiRWpiiQpFgZQdeePSr+kSIs2JSApAC8d/rWXCjRqNy4J6fSpgeP6171C3KfAVak4TTsbet3KeSbZUjdHGGzyCPSvLfiJ8PtG/syTVbCA27hS8ioPl/Cu3UZ/vcdgM1n+OfEMOleGbh5ovMJUoEI7EVdamnTbZ72S5liKeJUYSerOd+EPgXw3HEmrXzx3zqMxiXgKeOo/wA9K9P8V/Ezwf4TtfLuL5Li7CjbbW3zEcfkBXyde+ItVkRre3uZbaHJOyJivX6VmwW8905fJY92Y818/ToPmuz9yVaKppvc9O8RfGrxBqOou+moljESQpHLYrldWguNcSXUPtDzXBO5wx+8c84/Wsy1ggtULqoZzwxPOKdbXs0MwaN8AnJPrXbThCGyOKrUnNe6Zs4kik2MNrDsR0qNvmGDwPauguI4tVjOWCXC8g8ZaufcNG21gQaclcujVc9HoQH5HA64qe2cKQTxUEnLZpEdTkUrG7Nq9YNZqpOTkfhWx4e1J7XT5QTzjK+prn1bzYFLdcVLHIVsZBkDnap/nVIxaRo2Wu3gkmlnuryCMklBC3y/Suq8P+JtLSzV38da3p9yFxsS3DIDnoDvz+lY/g42kWsWttqBt5bBWJkDkBfxNe5Q6H8DVeI6rJowV0wRDenIJ6Zw2PaqMZyWzR5SfiFfwao0Vl4+1Oa1JA3upUn1OMmjXfFVsUnd/HmrXVyhCwskIAb3LFs/pXp0/hn4EeZi3uNGQb+2oknb6ffqFfDvwWaZo7OXRCq9DcaiOTjt89NGd4djw+98QXTBTDqNzeEfeLMSp9Rird1qCz6KCo4YZOeCD3GKv+Mm02y8RXFvoRtDYEhCYgrA564b/CuXbKxNGG6Nzhsg0GiS6Bpz+XBIQMHNVJGzKXqS2IW2bIIyT34qoWIwD6VSLbuJ5mAzH6UjN6UqRs7bQhb6DNegeHPhPr2qWtrezNDaW85/5aN8wHriqMG7nn0AMj7AGJPTAzXdeDfCOotbya9eadIbS0y22TjzCBnp6V7J4D+Gei6PCkhtUublD+8luFz+QPGPwr0R9EtdnzMksZGChA24Pt0o50tzN03PZ2PmqxtjrEtx9rUwSzHKFV+UL7CqmsfD/UrWFpLRkuV67U6ge+a7D4i6fJ4S1kRghdPuPntZjwq+qZqrp3jGKHEdy0L7gMEkY59+ua74YeFSndip81LY8lvLOWC4aKW3ZWAyVbium8A2tkb8veiNEVQy71yQQRyK67xBp3/CVRGSz0m8lmAwJY4GAY+mcc15ww1KwvZNPIkhnUndFKMMCPY81yTw0W7Jm6xLjqz33wx490mx1KfTSWMbY2sBwflHNdnvj1FBdw3Eci5wCnGK+UDqupwuyy7VAB+bYMnjsa7Hwn44n0cRYuPNgAxLAVOSf73t3r18JWhSjytnzOZ4H6xJygrnvcM3lzMCd3HX3rQsrqM7sjnjKnuPWuc8H+IbLXtMGo2MbtG2d2VOVPoa1biWN7czKhABGfcelelGSlFvofO06c6dT2b77HM+O9Xga1u/9IzEmVwOOO/05Arxazee/wBQHH7uR/kH90Z4+ldN8SJJpLj7GoCmaQvNg5Bx0H0zio9FsBYaYLiXy3k8tpGU43DjivjsfXvNxP0jLsJ7Gmn3MLUb5tOv3MKLt3H7wyD7V3Hw48Xi41KDTL6NI5GBELoTgHHAwRxXM+GLy0vL5or5IyjtwHUfpXUeKYrCxeylt0iiaJw6uAOxz169K82EVzXPV6WOt1/X4bmd9Mi8gODypkO/PHIGP61514qsbWXUJ5ru28ss+BIi8MfU13qWGjvpU+vwQIbnbvZ3ODux79K8+vtZS7lgFugdIk2q8h+X3JHQ114n+EkctBXrM5xdBEkU88MxEa8A9Mn0xWNJouqNfxW1v5sjSHgMMHI612N9fPCqrLDYTOfmQLKBj8M1qfDIHVNaczxOXRi4wQyrnGTmufB0fbVFE2x+I9hRcupr+ALCfw/pklrJN5skzb5AV+7x0NWNYldJW8hGJlxvHrj2rqb+zi3PLG+1RyOPTua5LxLHqeq37abpqojQqDJcA427uw9elfoCnTwNFH5zDAzxldznuyaytb3UiIorEh1PUD5cn+lQ6u/9nxvaahaF080E4+XYcDOKv2Phjxhb26XFv4haRrZCUU4UEAd/XNQar4hluAum6raJJI3zFnXPOBkZrmpZ1Tqy5T0KuSTox5rnIXUPh1byRJbG5i3HO5XDHB6HnFcx4uivYZGaO4eeDaPLLcAr0A/AVtanaXH9qypkShSTvzkEegNXzbW15ostlfOiTK+63crkDjpxXocr3OKM/ZzVzy2O4kVmGcK3ZelXIbrcgjeMOMgDJ6D0rf8A+EHv5GMkMtuwDZI3gHH0NaMHhXyIA0kQlPIHl88/z60WOypiadrmUttYxxJNEu9iuQpHQ1has0yythiAeSR6961r23ubKcxvuRs5AK4/+vSanaO0QaS2kiVhxlCATVNKwqclfmZzIkYDDfNWhb6s8dtFbu7iOMkqAehPp+VUbq3eNicHApsdq8gHXJ4wa5rzUtDt5YSjdnT2KxaqzSySJLcRryoGGPv71k6qUt5pMHc54+ZelUoVnsrhZInZJUIIINWL3W7q6nMlxHC7Ec/uwMn1qnUtoyIw193Yn0zU2hQWwjUknAc9APb3rdt9StJr+JL2KSaJepzjP41zltcwKGkltAFkBCEMeCPrUF5fsCjW6iPHXaeDS9taJE8PzS0Rua7rIW/YWq7I/wCEHsKof25ceo/KsW4upZn3ORn6VF5j+o/KsfrBqsMki1wDwACPTpSBXY8Yx1qdY0H+c1NZKxm8sAZ6gEdRXwkmoq7Pe5ow94itoDhWK8E5JrR8lIonafAJGVyORV67FpYWCtJiR93yx9we+a569upbqYSynJxj6YrJT5yqCniXd6Ifd3RlURxgpGoxjPWq68U4DIo2k9MVR61GmqeiBOTznFOIOB8pP405EJ6EcetOAAO3IyeBxQdF0RMCFXjtUZjMjbB1PFX1QfxHA/rTGIJPlnHoRQTLVnZfD7xXbaPpF7pt0GwT5lrIOfLlwR+uf0rgbqZ5tala5YPKXLu7juTn+tX4kRHUrxzknua1n8MtqGkya0soRmmEaw55f6VKcU7nNVhKWxi3kc6qZY48ALkunAH4VTSYsBvbnNTXE0qI9jMJIIemW657Z9qteFfDmqeIL77Lp0DSHGWIIUY9ya6JyXJdmNLmU7I6vSZI/B/hBPEZgWbUb1yLXdz5Kg43fUkGucl8a6vq07NOY3kkOGPljOPSvdo/BGlv4b060u7Uai9ioaRd5U9cn646Y74ryX4meCH8L3C6tpQM2kzHanPzRMecEHnt1rkoTi3ZnTiOe2hXsfFmqaLbMltdhAy8rtB/nV2y+JN1vDzW1kwYDzEWPHm47GuAtZEnuhHdS7VJ+bqcUy5hgWY/Zg7hScMOCa6+SLONuS3Op13Vxq7faIoI7eBPkigUfKorm8ReZtLbDkjPpmltllxu88lf7vcGomQtISwyCecVokoqyE3c7TT5LMaUgs5pJEdctEf4GGOc9wacvy52nGTnmsnw1FsjdQu+Zlycn7qj/IrQnl8qF5/MBdcbV7NiuSorEYeSTaQ59yMCYzs6HHNLIVaM4BJUdz3qoL/WHg32thdzRu/P+iM4/lip11gq8dnqNl5MRIXc0JjYH1zgcVmjolUaV2iEO8F0lxG21lYMCK9u+H/iWHXNCWMsRdWwAaP1HY57141fxR4LwTLKuOCM8Edqk8N6hd6ZqUM1m0iGPngcH2rSPuu542c4OGLw90tT3WeR3mZiSwxgH09eKITuwDjBHUVn6PevqdlFfbdnn43JnlDirbuIl3HH54/CvYozVrn4Vi8NUp1nSe5JdXEVtEZZWwo6kV5f8TtXivbbyiXMfRQO/ua2vE+rRz7tsimBecleo/rXm2tXP2i4Zi4MY7CpxVZzdkz7DhzJ+WoqktzKWBSS2OD0qZUjAw2VXvimiYnhOg7Gm+ZuJ81gcVzRP0m05JDZ3VU53BRxjNVGJwMHpxSzyeYSD09PSmAVZ0wukSQO6yAo2H7H0NO1DdMQ8qBZB3U/fqE/KM+lXrFkkQBslR1B7ejD8adiZPW6MOQkZBGPaol4NautQqsglVdu8fMB0z/9frWbiiw1Jl6xAaCTM0a7QSNzYz9KYkreWGDHqapEVJDLjbG4GzdmnYpanQ+HLK81XzIlnVIUHzhhwc1tQeBtV1FmXRba61Axj55Am2MevJ61U0C4gh05ykilRJlowOSB0ye49q9X0HxydY0pdKtI5RKkYU7JBGo/3myD+AzTSPPr15Qeh5Zq2keJbHSobJ9M09VQlSQSZD06mqlx4N1y2MNxqmmXFvBIBiVFyD719E/8IdNf2kc89jpkn7vc0ZlbP1ziud8Q+KovCmnXlncQSK2PLhLSGVQD/CCeRVpHLHGzcrI8U1XTrrSbcMjrJA4yCO9ZRuJHDlzu46gV0t7qAutLmEiRxRu+5VznBPdfQetcjd3MRlxCSkajA2nGfrSkrHpUqkpaS0LqoqWMUnmofNboG56+lQRxvPOqJ1JxVaL5uQuBXXfDTTYL/Xw90rNDboZXA74xxQkOrNQ3PU/h94a0vQNOtbia3W41GWJZJHlGViDc4A9cd69X0sSXkARNmw9AeleeaVKL68QzJ5URG/aSBx1A+len+Go1Wz3hduen07f1p7HLQbd2xYbgQZikQgr93Pp6VowusiKQcgjOKyNbQ3RAtJNrgbiQOg7j9azLMXNlc7YriSVt4DB2OCOo+nWpZujY8UaJpmu2b2Gq2yzWs2M+qN2I9O9Zeg/DDwdpYD29oXcHh5TuNbUmoxLG0ciSRP0AYZz+NT6ffNJhMAfSk5yta5orFy30mwjKpHCFXbwV4ryb9orwVZf8I63iOzXbeQSKsjY++h45/HFevGYCNH9K5b4yoZ/h5qZILeUEf5fZ1pU3JSWpUoxa2PlSTTdTu7R5Wgxbxx5z34HJFeg/AmeyNzPFPDDK00Q+8oPIyD/MVn6dqFnNb/ZpWVRIpU7iV6/WovgXZi48byRs5xbgng8HJ/8ArV6eJjaKOWlFKWh658N9G1HTodZtzbrC73bSIDyu0jIx0qHxlfTWNo9qu6O5bhdy8ZPfHtXo+n7lJCNhQdwbGCaz/HOjW2r6PJ5sQ84KdsmeRx14rCni5wg4nHXy2FWsqh856/qNqbqIuzSbeMY5X1Puf8akn1QDRp7pQQjjykRv4h3/AJ1yWsRXUGqmGUgyKx3YHTtXX6bYrNo8ds58ySQdD0APH515FRuU2+59DD3aasc1byQC8WQP5Z4wa6c6vf3M0EQt7eWJMKGfJ496pz/DzUhaNc6dPFdMvW3LYkH58Gr3g3SdasL3zgkkMig7oJgVJHcc8U/ZSjIca0Weo6XA+p6QtpqMEKmRSAsTZEgAHHbHWuP8T+BfKd5dGL2dwuS1vKMow9Ae1O1/XtWg0qTUhH9lljIRFb+Ac8j6/wBKyPD/AMW75FS11exjvIxjD4+Yr7+pr2aeD9pRTkjyamKlRrNxMa08OeKNQ1J7C6sYLRdmTI4yAvqPWvUfB/hIeHINgl+0XUxxI+3HT0FWdE8T+DdYjxBePYTn70crFV/HtWheahA8+RcRzAjAeNg38ua7Muy+FKXMefj8dUrK19CbDfw4PbmuD8Q2+vWH2+XSY4TI90jxx8ncMfp0rsYrqIuAWI3KSAQAOPf1NUfECyS2MkkMqxuh69ge2f8A61d+ZwcsO7HLgXaqmV49Z8Srp9pKtpCq3EQ86MgkxtjBAPpmuL+J3mL9juAJVmfKKkZ53/4V1/hzULr7P5VxdCYKuAixYCgehxVDXxbyTW7XOTvkzE2wkoe3QcGvj8NzSqabn1eIcVS1Mzw9aJd6LA8wkdjjaH6j61HqelTLC7KuSr4ZR9en5V0UEkdtaRorAOOcBc5FQXUIuW3ZfKtlmBIJzzj3r7+lfkSkfnFeX7122OO0qKeJ5jKpYHAXnkGtiazlltSfuFjkbeMGtzT7SKSRh5ZUkggnocUyeCVpGG1lQMQQxz+lbcphOo1qjy7xAl1YmSWYl0LZG5dxB9Qawp9c1SEAIGSJhjaRnPvXafETVF0yT7GI0kaVc5ZcADt171wcQ164ea4srG6njYcEwkoB/IV5WLx9OhLlbPo8uwtXEUuaxJczm7sUZbdY3XAlK/xfhVaFxEcYGWU4zT9Ou724YxqgjuY+Qc43AdQR61HJcOshykYIPPArejiIVY8yNqlKVL3SykRkjDGLIXqc846VnX9uYznGPQHqfepmunBwjcenp+FMn1GaVdr/ADAcDgZFaT5ZIzpxlFmcw9SeO2elT3UdkYVe2ll3KoDoy/xd8VI1sXieaNkZVxkbgD+XeqUjMB8vTvXFazOyLGHqcUYqa3ELA+Y7J6YHWpdlr/z8P+RpWQ7l+HCIXYLgckmnC/jg/wBTh5AuWcrx+FUHLyMWzk0+C1DMGbPI5r4dn0LwsLXkRTXM11KHdmY7uc05YGJAz0/WrCRKpPGB61LtMUJlbvwMHkGgqFTlajBaFIgqSD2pQxU5ChuKQks3qTU9tFw7yEKijLE0HaNiycADJNWfInQLIYiAQSCRWx4E0a/8Way9rZLFCgx85/gHTPvXda/8Htb0HTJNRs9VW6CKWljIK5+nWob1sSjynlm64GentTkXK7guKv3CQSShhkFlywHOD3qBRyFXnIJFWtSW2QfxBQQDXV+JZksrLTLCBjtit1kZgeHZgGJH0JxXMGEqST1NbsMR1Pw8rsGaWyfYP9pScfzNZ1NNTWkrpoypdOvNakH2aJ5JWwMBc7q9++Hfh++8K+Hra0+y2iS3EfmSSSRFnL4+4uD25ryZ9Wn8M6Ylpptw1vcTL5lyyjDZPAT8hn8ap6V4/wDFFk0KrdtNFCf3cUrblXnt6VEueqrLYzXLQd2ey3urkuupq7x3llJ5c1o/ymT2K9q4Px/rGk3jPc6hMltFcA4t1Y4DDHUZ4I5/OsHxp8QLue6ivHtY47rCkMnc+hNed6tf32sak15eNl27DoPalDDNMzq4tVPhHarLYz6i8mnwNFAcbcn25qNMgZ6EdKPIxjLH8KkaEqmVJP1r04w5VY5ZT5txrHa6zAYR+1WZQscasMfMRj2qCLc8RjyTt9aZlsBSTgdAaZNzY8IyM+ueWST5kbL1xj/OK9I+FugQ6nqUk95bpc29swARxxuzzXlnhb/kOxfMFHQn0FepeFo9RtZbWTSrgwsbzyyd3DRn7wx+ZrjxAsPH96fQ+jQafDbIkVtBFEnAGwAV4D+1FNjxLYwx2kaW4QsGRAM/XFejX3hie41yyvLO8YFf9b5g3cnuOazPjrocU/gqdZsz3kLq0b4yeoGB+dc0J8rPTlBHgWhXETloSzbJASTngGtXRbm2jkzM5K5wTnBFb0PgeDR/C8muXl2/29U3GIrxggY/wrH0VrIDfNCkrAgKccgc12QtPU8fMm4Umkek/Dq4hZyk7Dy5OA2efbnpU/xEv4bArY2z7mJLEnoRxXK6TFLHIfKDeW4zyf6Vy3jLWJJdSmywcKAgwcYrrj7qsj8+hlX1rFXsVvEGrNP/AKPEMRjqBWBcznbsJyc8n+lQzTktgfXNRFiTk9aix95hcDTw8UktQaTaRjJzTwwK5z2qLAJGSBxmkjbJI9s0zrsh3Oaec7uM/h0ptJuBHGTjqB3qiWOb7pBzTrUsHxnFRI5YDjk8VYtWTzlDDhmABzTjuZTdlcju1f7KzMxOHxz6VR4xzXT6nYfZtCluJQA/2navoRgHIrmGB6E5/pW8kjKnUU1dDShC7s5FRsDnGDUuGydpDLjirSxKVB6nFTYv2liva3VzanMTMvp3rU0LXm0y+W6JYODkjs1Vxbs45H0FS6fpKXN/GjAqvLHjoB1NOMG9jKpOEk1JHtcHx20yPRY7V7CeScoQ0gOMH8uleV+OPGUniG6QiFokTJCk5znvWBJZkzyqEKAcqMdavWWltPpc0+zJhIJPtnH9a0UGefHDYenLnRmXN3c3WAWJwMDAxgUJa8E+vWrGwISAMUvfijkbep3SmnsR4Krg8CvQfhChZL+VUBxtBb/Z5z/IVwEmXOfbB969A+EokSx1LanUxj/0Kq5LHNiH7jPS9HiJWOUof3zAKT6V6npg8q1WDfs2oPxrzzw/MlxfWtswPyHv09q9FeBJQoXcjDgMpwc1nU0ZeG2My0mlt9buFuFHlXXMZHTioU3y6pKsZDeW6t7Vqa9ak6cHVcPbcqR6CuC+G/idNa1rXNMmjMdzaMOezKTkc/jUHUemajsNkWKrk9Mise2t2SQ3VuSh6YOSua1dUJKRoRwAM+1P0uIqm1vX8DUMCGO/d1MFxCYpAOMdD9Kg8ZobvwfqkKg/PBke+CD/AEqzeRLPciFsDLZzUOpQSRafdQzCSSApgMv8I96cXZplI8AsdAvHWKbyomB7H7w56U/4UrFY/Fe8gZTGDESQOAMEf411niTxKbLxhYabEQNMt/LjuVH3TuxyR9DWS1qmlfHu0dF2x3tudrL0PQ4/SvSxF3C7OWm7zsj37Toglv25zjI4NOuiFLJIDtAwRjnFQQ3Sm1jkALSuowg6596ilWZZ/MuCD8mRjoK8pnUfOvxi0oaZ45kmEBMVwoZRjAHrzSeELW+1Kdbe1t8oOTJz0711f7Q9xbWutaA8iq6yOQ4x2pml+LdP023WOGFTsGPmYLn8s1pTwznqgdfkVjeTSnicNIJYCgC7iMZIq8CsOZpB57rbO7BlyTjJH6Vj/wDCw7a5tBEyRKOfujc2fU5xW94GS012HzFlmjI3LtzwQST0rrqU3CF5Iyi03dM4fxHdJqPw/vNYu4I1mulZQqA7VUcIOe+d1eOW8UpK9AB3HevbPij4cv8ARfC82j2KSywRzG4jwfvJ3X6g5/OvItJUJ88gGBghW6dK7cHJSgcOMXvGx4N0RdW1iG0kYjzAQGHrXXav4Rv9J1D7HpOpTtLEnmMvXI/xrntF1A6bqdte2wQmMDIB6c16rDe6RqCJf22omO5d8yK3J245rtg2mebbm0OJ0HXpUv10/VpRubhWYYJPp+PSuh1rVbC2C2jyj7Q/AVv4+mP8+1cZ4xuLY69LcxMGK8KF4Dc9fwrC0FL7WfFls8qGWRgxV92M7cfyzW2Jq3oWZtQglNM72y1qV7iawstGAuYGKu6udvB96n8XzT6foEN25jlcSAMvTr1wfauk0HwxLarIzZDzHdIQSdxJ5rifibK97qi6JZ2zSC3bJG3JY4HpXz2CwzjXU76I9vE1Yzo8ltWZtlqE8l4wkc4Tg4/pWtbasFLB23AZ2uOTgevvVm38KWsnhwXmpG506+VSC+R8y8YJGf8AOa56x0a7SNpIbpLqAsQNxw+c9q+kp4mMpHy1fL5R1Okg1LfMsqfMH52noD/jWwZ42JYRsCBg5Oea4stcWsqxv8gHJBbhj3NalvqqrHjeoUnJUiu5TU1oeLVoyTuReKNDhvdRj1E2j3ZWMhrfGenp9a3vtWotp8Fhpvh+G2hkQCUPnMf5Yx+NQafeCcO4YYC8nrkf40HV7i3lvHupAIgB85P3AO3618XxBS9lWUu591w5inOg6fU831/wsIvFN1eQfJEI2KkOBlwvp6Zri7yyfa0nzMu75m29K7TWvF1kksqQkM7E7Djg5ODWXc29tqMSz6bcxyFgTJD0ZT7eorvyeUXTs2ZY72ntL2OPPyuy4xgmq7HP51oalbSRORsZQPUHms5uK9WquUwi+ZD7cL5vzHAJ5qXU7OS1uNjRsFYBkOOCCKrgnFTxXJaMRTEsi9BnGKybLRBGsRT5ywPsKdsg/vN+VJIAh46Hkc0zdSA0IBuO7A+lXoYJWwVU7cZqJIiCEUcmr8KvDEUZ8KwwxNfDs97EVpaJFNY1RHL/ACEAkZOQaoyymb5icD07VPcsrDiTgHpjrVdY84C44OcH+VI6sNT5Y3YJGFcuzDPYZqSf59OkjV2VsjI9R6fWpba3eWXDR/kOas3li8VlNNIhSMjAZhj5v8imk2bTqRjozuf2fNNuJbi4hE72U3RX7NnpnNeyaja38FrLpLa5+/njAEjrlQcngZHXp1r538K+L5dHYSI58/y8N2Bx0rds/Fn9oXWBs+0ZJ83zCTn19sVhKE+a5bnBK5kalo0y6rd26xsohcgsOCT3NZc9i9u4LBwucBscV7u2nQ3Ph42S3ka3VwxleQJyf9kmvJfE2l39vcbbyVRbI+FJPTnt613+zUYJngQzGUqrgjO0rS7jVZcLG/lg4d8cJ7k9q6DXDZ6F4fht9MkMxkuBMZiCNxUYxg9RuGazre/2W3lWoZIlY/MOsh46+mKtXDyXnhu5gJ3i2YS5I+7khSP1rzqsXKVz26WIitHucbfXdxfXT3F0xeZzlie5qxa2xaPzOSw6CnW9t5lxyOc8ewrVntZIgknTOcgdPpXoUad46HFicSk7Gd4psT9ns9rA+YAS36Y/SufMaocBc++ea7ptOvNat7W3srWSSWPK/KOOpP8AWpZ/hb4oEaO9l5O84DO3BNW7I5qdU4A9KmUgqoPA7mres6NfaTfPZ3sWyVD26Gq1vCzDDHbjqcdKaZp7SJBgJKMds9KbcI/LKpPetA2EjxI6qRlsCr2kaV5t6qSSbVB5yOhFNIyqYiMFdsg8B6esuuoJRmMKXcv0HBruvDN/5FhLDcIYz5peBwxBweoH4ZNQ6PpwsEmlR9zOSowMcV00GgrPZAwGN3KHyoyMYOOM+1Z1aSkjzoZoo11bueh+D5f+JZbuyz/N8pldyy+2T0Fa9zGkjE3G1wuThyDkk+9eS2HxRsvD2nnSptMkSdCd4MmUJ6ZzisC/+M1yS6Q228q3yheF/E815ipy5rH13tU0mT/G3xHdzXi6RaWbW0Bwshzlnwc4GOMe1c1o2jX8llHOyhY+ykc89K2/DF3FrOqNrniQhfNbdGqDCjjHf6V6ZpUehX6ONNvbcOgCxq2OSc9a9KhBI+PzvMK3N7OnG6OAtLz7Cht76NBOThCG+4PwPXNeWavceffTOucFz1r6I1nwWrWct6jJKYY2J5wqnHT3r5x1SNodQnjPBVyK3ehzZHUUqsu5AOtBoBoP51C1Pp27sTjuKjOVOfWn/r71FMwUBiOAf0qtibj1lJXLcUnmKOnf1FdX4R8Aa14kFtcW5it7W5fbHLIeK71/gvDYAnUtRafY3zCJNo+mcmspYinDRmqoTkro8X3Fh8px9KIwwYE9Acg+hr6e8DfCvwRcxb7izlmOcASSD/CneKfAXgixuXgtdKjX5NvXnJIxTp14zklExr0XCDcjwLxjfzTaXpUTAKjQ7jgdSCR/IVzQBYZHIrufjTpdno+rWVlYtJ5aW4+V+cEnJAP41xduNoyqE16D3sedQaVK8R8ansuR6AVLGxjkU4IIPAIqSBdxDjgr1xVnYs5yeGHKZGKaiZylZkaOyKrEBW4yMZrqfDtsFiubgxhne3YRbV6E5rmUhkfDkkjpz0x/jXWeEZFtwTPEfKJ2lmOBxzj/AOvXZQpo4MZWahoYlxGssi+YCrYwzY5zW54esliivUXLRNERgjj2q9rFvZSEysCh6hdmePrSSXtoIhHDAVn2j5zwBx+tbunFHB9YcopI4y5tVRWCjnO47uvFVFjzgAKeg+tdHLbLIszMQ4zjO3nNZNzF5bBolAKnnNZOkejSruSM+QeUSD34PtXf/DCPGiXM2Tua4UfTANcFeRvjcPmAHX1P/wCuvSvhtBH/AMI4hXcGaUsQelcktGa13aB6D4cjZLvzzMFkzxkf413Ol312ZlaeISRrncUNcFokEU7M4kYMW7jAr0nwioKlH2uwHGfSsKq1N8M9DA+KPiaO18O/ZbRitxdfLknDIuMk/oK8d/ZwuGn+IesJNKXeWPBYH7xDHmui+NN/ZXGu3flOyGxBjGOMnvx+Fcf+zAjz/Ee5mB+XyXb88mtJU0oJnWtT6culJnwQCB1yavWmBajGMgmq94hWZs0lxOYLUdeQMfWuUpIitiJb93POKn1VmXRrt0XcRCT+lQ6Sf3Tyd+maXXZfJ0W+lIYqluxOPTFEfiB7Hg9pZX9zZ6rPcWPF3Kp+0SsAECn3rP8AiFrckPjPwrqkkXlPDIUYZ4P3Rke3Nd3pvizTNT8Ovpk+1kkjKl/M2tgj6dRXjvxz1kXniKzSIZS1XCsDxwRzXqVm3T1OGjRkql0fWWiRRumU3bRIW3H0Y5A/Iir+oRgQDnp1J9D9awfhndpqXhPSNQWQyGazi3n1ZVAJ/Sl+IOrCw0UTK23E6qxHua8lO7sei0eK/tQXG3WNGj/uIz/TkV5fbBpNQOJCVZhgZ7d6679o29eb4hGEsWW0gSMjPfHP8q5bw9KrIH2gMvyk/X/9dezh3GMEjhrU1J6nVabHj52Gf65rq9P8R6h4Z0me709lbyZEZkZc7lJCkVyFncKXRMY5xz6V0NoI5dG1qFwrn7LuBz0wwNaVHdWZEfdWh0l18UovEGgSwX+mTwSqSYpoFLAcfj+P4V5D4vCG1tdds5FWC8YpLGB/qZR1XHYcEj2Fey+HdKsbfwNpjtZpMb2U7mzgiMAZI98muC8R6AdD1690K/kU2F+xRePuydUf65wD9aIwUNYo5liOd2ZwOnajI86pkBD8pOa9A0exYaDNq81yY7WI4wp+ZiOoFebG1m0+/eymBEschRvwNdzqF4IfDlvYiXKyx7mXuK6XIl00pXR03g7TdKvLcajqUsQMynyopZM7c/dOM+mKb8MNV0Tw/wCKdRk1CMSBPlixHnkk9PToK4zw5a6yk9mTer5fmDbEx7A9q6v4UeHYvEvjLUvtkhFvGVD459aznaSszSLs7o9J1X4qaTBaSfYLCRyWEaDG0bm4B9eprIufFvhjw0xNw8L6my7pnUB3Dnnnv0IqPxZ4a05rd7TToBFFbTxtHKTu37WG78DXGanodomu3s00SySPICGfnb8oxWapRWhrKtzaMqeOvH03irybXT45Qm/kopGfw61skpBpMMcZKyRxBCvqx6n8zmnQxwwxHykjA46KBisLVb/E8ce5VAcYHXJ7V0QiorQwqSciHxk0p0ASIXQwctkkZB65/KuQ0XXJ2eLdJIQjYJJ6jtXeSSwXbvb3ChEmTZtblc1X0TwItvdokiKC3zEEfzropOadkcFeVOCs0bmi3bR2EssIO5V3ZI4rkfH1zfTO9vEZ2WdV2sMgM47HHFdvfWBttOlWCPsRheBwOlczqV2GtDKwGAAdp6fWuTNaUZK0jbI5uFRuK3PLHhntpWMyMHU9WGcHuKuaT9ovbpIrRxA3UsG25/GtG/U3MxDDknJwOBk5x+VYEkc9rIxwVB4zXz9Oaj8J9tVg+VqSOtstXgFtNbayv2pVyIyQMnH+11/WsW+02GcfbLIHyHJGzOShHb9arW+p3JsWtjaxSxRqSWKkkZ757Umj6gLeXy5cCCQYOB90nv8AhXq4bHyvyT2PEq4CMYudPcqtA6HG04JxkjqaQ2kwDHaSwPKgdB61sX1g5lWGArMX+ZDGcqR/Ss8PJbzlXlO9vlf29q9hwi9UzzFJrcong4wcj2pM+x/KtktDEc/u5CwyTijz4f8AnjHS9gxe3XYvznyFG11Zu+TVS5uHkAQ9D3B6GomLbCSTzUYzkDNfBn1FOlGn8WrEIYyBBk8d61tK0e6kVrmTZFbqQrSMRjPt60abaJcTRoA28nn0xWh4/cQanHokKvFFaqA2G6v6tSbsZyxM60/ZQ0K8t+ljJs0yQSSA/PPtO4fQH+lVtY1LU9WtY7K4nWWJXLKGUZz9arWkRBZJj5q43eahxiiB453jh2srbgCfxqo7msqEaavPVmNfQ3cE+PK3Yz8oFdT4N8RaVaCET2MUckbZd+jup6r/APrrsdW8K2ttZxzlkecICxHQH0rhb3T0hvdzxRuhOCSO56dK2lBx3Mef2kXHoe/eCNPHiBvOsLtvswYruyAVx2P/ANbiub+KHgy8t2EuQ67j5SKckj+leeeHPEOpaXqEdql5JbtGdsZj4G70I6EV7n4b+IOlXvhma516FA9oPLmIGQT6g+/pWqalGzPn6mDlh5XjuzwxtOntR5bpJFK7ALjkH1BxXeR6bp9j4T8m3Zpb+fDTo8WVxjoM+h5/CuW8ReOLePVJJrPSfOs2yYpXyMnPauq+GXijQtZvLhJQY7grtghncYdsc/rWCpwubTxGLhDSJzMGh4vkMqMvU5GDn2Ndzonha0u4QzrtVGIeWR/lUfjU2oaWn9oxyCJ87trFGyCfb2rL+JN/cWKQw2P+j2kwUsivnIA6g+9bVpKEPdPPwqrYysoyZ1Da/pOgqkXh6O3lwCkuFBZtvUjPQE5HNUkj8d+IZJJJ5oBH1WIYBOeh49sj8TXl/geG41LxBNJCPMjQ52gk5+nNepWXjSfSpo47WyS5lZtkkJfBHv7V4lSpOTPvaOGhSpqKRT8R6BNrERstV0S3tbmNQltMj8yEDAUt/Q143qtlNYXktvcR+XJGxUr3J98V794s8V2aTwR3ls+AizFA2CrHkEH1FeL+NS1z4iupFjkUSMGUseMEV6WFk5R1PIzCKpT5l1LHhWxW4tiCqyHeNq+hz/hXXW+g2cFwGkTBxu+XnJJ6VzPgRsNINpQKwPPf3r1fQ7ZpZRPcAFY0ygcceoPvXdFWR8LmFeq61lszCj0SNmKXCpGmMM6njPtjtV7UNR0rwxpl2LyeFpREyDAG/DLx+YIqt4z8Q6Nom+G4nEt4udscbY257Ef56V5Z4tuxqM7T3zTGR1RmQkcKFG0e3GK56tWKPRyfJq+Jqe0kvdOQ1VYrq/llWRnQsSu/PSq5s5EIIwvzD8a6a2s7SV1lMSooAxzksO/t6dqzdZfYwMMYHlrwD3PSuT2iP0CWE9hTTkzRsbV72MNPO8nl9iS2atSS3EEojhiiU7soVjCt7YI/nVDw/qcDWyxtiKQHLkHBariTWyXaSSzqAg+6D1FZLn9pzHo1PqCwvw+8eu/DXxBf3dnJo+r+YERS43kncoHc14R4wZJfEN6YwADKcYXH6V6T4C1r+1ddlSyDRrb2ku5lP3vlbHWvNfEsZj1u6DBgS5OT3r0Iyctz8/w1D2WLly9TK2lR1oxT35C/TmlTjmrPdegwKar32VBwAcYJq15gYZ6cZ61DdcKQOc96EK6PZ/gTd+d4Qtdru0lpftuXrsUhcY9uDXrGrXYuRMiqMjgcY5rwf9ne+U3Gr6O0oRpY1nj9crnP869VsNT82+WFgRxj8a8zEQamz0qFT3dDX8J3qWzOrxuPK3M3PGax/Ek19eFNQDBXaTy404wffmugWKGwvppbhV2yIPpyKwtTJLW6BgY4pi2P8arC6VEc2YO9KTPGPjW88uuWrTj5xDtY57g1xlmpUEevvXU/F7zpPExmZmKMMoPQZrm7ZAACcjjpivekvePAw/8AAQ9d6vkZyM5xzirelMZbgCUO0I4OODn69qkskh8xo5BwRkc1aEKplUUqDwCpz19a6IwbWhjVqqO5Esu+dI42HlZ4BOMketd/ouiTvpzGEKGkwC5PCFh2x9a5jRtDkSZFljEjSNnPcDtXcKs9raFWgeJFGVKk5IHGPzFdtCJ4GPxF7RgTXFzBZadGLqFDdICkiLHww7MD/hXNLY3d5NJNKBszv8sLkjjtiteR/tCAkZXqBnNCW0sRE4Mg3Dgg8HtitJxZxQbp6rc5OcSL5gZpFBPyL0IHqaoTwqWJkPzsc4LZJ/GuruLGS7cuEKvt5I6ACub1XT2ixIDliPrz7Vm07Hp4bERlpcx7kosuM5XPzJnAru/BGY9E8tT8oYnk8jpXEixd2jZk+ZzwPSu28Pp5Nl5KFh8zcj8K5Zx0PRqyvA77wvNbMcOXYE8YPA969T8KQ6dJCZVn2uR82P615DoU6Wm1ZbYeWyfLz1P1ruJLueDwpc3dnasJfJJUr0B9xXDVdmdmF1R5P8UbKIvrGoxOr75WJ9Dz/Os39lFQ3xAljb+O2YqB+NcfrerXiaNcwXjOkzyYGckH1rqv2cJYrT4h2bs2DNbSgEeu04/WuyavTOxH1PqdzZ23zXt1BArHCGWQLn86pat80aeWwKEAgg5yK8M/auvJvI0JhdNEpSViAx6gr/jXpvw1lurn4f6I9zMZG+xxnce/AxXn8j5blnWQR+VYAD+I81D4oU/8I/quP+fVgP8Avk1OxISOMHJ9KqeL3MfhDVpjniHGfrxSp/EhM+cvD8MjTxKUJAGcDHHtXF/F+Mpq8WEIAjxiu88PtsmBHC8ZHtXJ/FeEz6pG4BAKdK9nEr92YwmoS1PfP2WbuW7+GdqszMwhnkRc9gCaufHcsnhoW0LbBPdxDJ7cmqf7L1s9p8NoBtzvlkfn/eIpf2kH8jwZaBj8814pz6Y//XXipXqJHXvG54t8cLORfiHrO/cy5D574z2rlNMeaG0kaLOB0zzzXpPj61lvdUN3dHzJLiwhJbb944FZVloUf9nY2iMlTnIr1+XZnmzk+ZnEyaldh1y7ugOQCa3NL1qW18M6vt2o04SEkHn7wJx+FW7zQFAeTAbHCn1rB8VQC1srTTokKOT50vPPPT9MVb1JR6n8JvFOl6jpC6DqUzQzW2fs8nmsMZxnp9BR8Xp7GfUNOsYJvtTySRK7tIW53Dua8RhE0MkciSsjDupwa6PwS1zf+LbIvI0kcQedt3ONqkgfnim3KxhKlHmuiz48Kr4zu/mZdjIuFOc4RR/Spre4V9TtbcgEeVhg3Q0+e2+238t9LES7Slic9ec/pSS2rp4mimCZVWACD0waqN+o5HWaDsktgqFHwjuueCpAJ4/Kq3wj8Xw6H4q1O3nfbHd/IxJwfz7VPpcIgM/yuuY5MDHqCK860S0luPEN2F+Zi2ACP1qmrivoe7+M9a03SLS2uI9UaXT1TBAPzAgjjFcHJ430fWPEEkNpLKFuGUKGH+yB9O1Rajpn/FPyzT5kkQgLE3O/PH6ZzWP4b061tr0iS18ySZMb0Q/u8e3qK5a1flqpFUYRdNy6nbsCsBYg4bOcD9a8+1i5ddbtod2WdWxk8A5OK9A1GRltyAW4I3fSvPfGNr5eo280JIYkMvc12t2VyI2k7HTqJEijuPLLsx2sm0HI9frXpvhWeC70+OaUR70wrZwOcYrzKC8kbSFliQTzFMoFbuOoqLRteuYhiEs0cpx9nb73uS3qK5cTjpYVLS9zZZfHEO97HpXi67so7d4UAkkxvxHwcAfr9BXlHizFvLBBGwNvd/PG6HK4Pb+VdQlhrWpBZ44WiD7f3srYA2k8/liovEXhe7g8NrOHM8lr8yeWACcjkjOeOnFcH1qviU3KOhtSWFwVePLK559Kr27eSJg0kZyckEkDnvXOeI78TSNGW24Ixz0PvVt73bJMtyz7z1Y4DE56dKxN6NqHmzoWRmG4eo+tcVNPU+orzUoqx1HhG/uPshMQSWQR+Qw2/wCsQkZUjv8AXtim6toEeDd6aHZWOGtiCWU+2Kn8LW/hqe732+qT2kh3fumYHvxjjmut8Mrcafq13GJBLCAq7ymSGbO3b71jWqSgYwpwatI5vQtG1fTixu9JuZrWZdhUqQVyRhh6YOPzqLV/D0kVw5ljZGU7CnfpxmvSFvJ3nVRMzsikq27ggEAE/UEn8BWdrVh58wmy7l0JYsc7uK9/IsXPEXpzR8znCp4eacHueWvbCM7GHzLwaTyV9/zNdXqGgXJuMC2GQoBIPWq3/CPXf/Pt+tfRqLWh5P1ldzELMVwFJ+lWtOsXuZ1QFlyMjA5PtWxouiC4WQzApIACFXv7V3eg6JaRQx3At4sqAThiQwPXmvzg9LMs+p0Lwjqxvgzw1PpE0OqTbZ0wGK7udv8AnNeceKrhdW8U6jeozvFLOxMjD5hz6V9C6NBaXVrdAR+XCIWXbu4HHT/PrXzfbrJJqMtrajzF8w4RTknrUtHRw1XnWcqtUZLIYYS0alIgep7+9Q6BcxLrFuZI0e3aTDBucg10WrW8VvawmeOMxPHnIPCsB0PvXNwR26RMLeWMs4zheduPb8auKPcqVlUbPUfE8c9hZC2sbpZUaMMq7wwVeOnpXn9xetI8kUgGCh3YTvVnQpGmuI4Uu2LkHGQdpIHQ5+lVb5MX8sW05U8+ldE3cwpctmLHNGl9BIHQvIAcn1PrXc2TWq5XUg32dQrsg5DEcqD7Zrh5dPhiMMnmxqRLsC7hu49utdn4KC3NlrV3qLBo4gqwrgcvwM/lis5O0TGf72pF9jsLe80fTdN+3y2qXEDEgeXGCP1xXDfEW30n+zV12zVrGcMCjbcFsnpxW34e1a5gha21PSXGkqQN3lnlj39RU3xO06LU/Dxg061XYcMigZOPUfhXBTk0z3JQhKlsejfCW/h1jwDDNLbxSlQVZ1UAtgDJNee/F2UrC+FkZVUrLn+H+6o+ldl8EbV9J8EbJFk8lySjSDjoAefwrkviLdQvHeRTxr5EkjF5gcjr29a7a8vc1PkMJUjQx2i0OM8FyXdnqEEtmyK7YDAAjHA7V7po5tn04XE4gS5K4LleSSPWvEdAkjgmF3Zzi5lhkUgEjO0AcY/xrstP8W6Fc2rW2oTSQRM4YADnPPT1rzbXZ9pCcZRvc2bZY72+kt9QtLO4dD5aPFJ5h59eOKwvFPhC6eaVbfCgMCFYEn8K2/CFtYwam1/bCUxs+VBjwWx3Ix0rrdR1GCMM0hXzWXoBwvvzz/8Aqr1MNHljqfD55mUFV5U9jw+1sbnT7yEPE+N22TGODg16DceJhpHhC5cBPPjjO1scA44qp4mvdGtpWaZ1UkhuRhguegH5da5bWNU0LVrCawS7lEZYF2OBt9h6+9byqKx4OFp1cXWUox904WSZtSvJb2/n825lJZgCeMVn3NxtmKqxJbOFUnC+1dIsWmC8lGkHzFjG3zZhlm+i9O3pVa4t4oGWYxx7vvNuXA9xXlTactT9Uoc6oRVKFkijp9vLJGEJy/YD+GtO/wBMtFtylzsedQNseMkCpbK5hU5tbYOOOQCSCaQkzs8skmJMnzGJ5GazlOzOqKjKHvmCdDW4uMWylHAzgnFRk/YpdkiYVON3Yn69e1bN/qNpZQOE3Kz8bv4m+npWP53ny7pIg6gfKueB7+5rroptanh46dOGkTvPgfHI+rXl6IP3ZTywccZPbH41xfjpWTxJdbsZLcfma9Q+DaSLpRnCqoaXAz0yD0rzD4jMz+KrpiQTnnHTqa6Yqx8TgcZLEZpOPY59eaeehFRxcHmplGa1sfYMYFPY4FNnTKZzzU4HtStE23dnjqQRTSIkN8HaxJoHia3v1LbAdsoXqUPUV7Vps4fULe5tpFe3uWypzyv/ANevB54n88jAz1r1/wCFFrcT2lt55IC/Mue3GM1yYqKtc6sNJ3seva0ok022nLB1QgOT3Fcjql8Yb5YmwzNMAOeq+tddr5jt/Dn2TB86ZQqrnPJ71w2pWXl3x82T/VqAWA/iP+TWODjz1UgxslGhJs4b4u2SyXkMm0jDMBge5xXBmKWE/Mrg4NeleM1mupFyQyI3OeCDjFcu9pcyyLBJGcduBivpalB82h8pRxNoWZW0/S7qe0SaNck4I5wfpXX6HoGLdWuoypblt3arWgwQQwRAKAemCBXXw26T2x2gEbeeOK76FKyPLxGJnPyMSKwdHhZYlC57D1//AFV1Wl6RJd20zOq4VSRxjJ68VS8oWNtNcXDeXHENzFvbt9a4DxB8QprqaK00a5ksw2Yyqk45/iyfaqrVI0N9zjoYN4qbS1semW/hhk/eAQ7lAYBHG73PFJqWmNbWmBGA/BCBeBXmGkazqmmTb5riWYHqd2Cf+BdK9L0bxSNQRF1uR1+0DFvLsHHoCQMdK4qeZwc+SSO+tkc6dL2l7mdp+nvNcHfExhJwVIwM1X8UaFEm2LKg/eUjoB6/rW3rputOkO0MAFzuHQ+lc5LqEmozN5rmML8uD2r2HRvG55NCnzO6exyms2a2ce1yAG+4y9vStXws0Ulmwdv3ik8A/rT9c0xriAIsiuiA7ckDn1zUXhPSpog07nkjC+9cFeNke5R0WrOw0/VYIbUQvBv8sHDAcqR6V6h4W1OKfSEQ2UiAqNrkZBzXl+hxrbz+a8QfcG4I9a9Q8G3wubBLcxtEOuV7V4tfc9nDyVtD53+LVtZ29nqUM0aPMk52NGMbeeprJ+BOB8RdC8xlw7lSG6Zrq/jZaNt1op5TFZjuYcNjd6V578Nb2Gy8VaFcTSeWkV7HvY9huFdr/h/I3k7WPRv2qjJNDoqqgco8uSOn8NetfDJ1uvA2gSBNp+yRK6+m1QP6Vx/xw0A67b2b2U8EIXzHJlb7ynb0rsfhbaNaeEtNRmVgluFyO/Fcba5LGvQ6SeUPdMqDAAwDVHx9L5Pw81h2bpEB7n5gKmKst6CvO5sVlfFiZIvhxqqswQy7UU5xzvU/0rOkvfRJ4hoTMJRg44Gc/XpXKfFBnN4pdvl2n866rQFbzVXdgkYBbgnmuR+JREl/HGG3cH+le1iVemc0viPo79m8yf8ACuNOzkxlXwT67zxXN/tYm4Ol6HDESUad9y/981vfsyXIbwBb2bE7YJnXI9Dk1zf7S199o1jR7MqTFHudVA5JOB/SvHpwcqyR3X9wqavLaX/hTQtTt2fzEiW2lUpk8Dv+Iq19hhaCMsyHK5BY8D8KyZf3Xwvie35cXZDFRgDrxWVpN9cNGXdslBkDrXq7aHG0nuWruG3S68p5i+ScKgzXDavCNQ1m4csSA21Sf7o4FdJJJKLye9clFt4Wk5/Af+zVykVzBGd6PuzxgnOacNzlrXtoQXWkOsyoQMDnJrp/hnpm3xBqILbESwJ64PLoP61krdJIYwCxbpyK6r4flhqGut5QM62KhR3yZENbTV46M5oNp6lHx5d6R4euI7WwVp7mSMMUJI2MOnFZ2g6tbatqoikspra5XaVyOHx1POKf4mtprfxRHqt1bST3A5I2fLtCjnnjPWuvtLW+1zVo7mTRGs5LcRsZdgA2Yb8OcivKeNkq/s7Hs0sHCdHnb1NRbSH7PK4ThkJz6ZHOa4/QtMtLe+ubpmhAZzyzAYArq/FeqjSNKkWJFa4kGyKPB5J9hXlN5oeuOtxeohkVf3kgDZES+/YV6Mp8quebCPNLlZr+NfENpNax2loZVZWxJvYHj2wexxXO6dqrrd26fablNz7ZCz8FfasyS3Y+VLcLhpPmC4I3A96kaCBTnJUKQQAwGPzrzJyc58x6UKcYxskexvLZz2kcsNzDKOjFXGawL3S7m7122MCmSRD8m48H0z7V5rHJctcMltK0Z6g7wor034S61by+ILXT7uRmlKkh2fOWx0Br0KeITXLJHDVws4PnicPpetajF4kXTL5WRfPIMY4Cn1ArvNF0zOr+e8UeFPDAZOTzXL/Eyazt/HyyRw+TJHNl2BwD6Eeveuu8P3EUksN9EZPJ3cAk59Pp3ow372fLPVIzxV/ZXR2TXARlEQAIXLbvusO/H6VYjZprNS/zIVKNn+tUVZFkkYhcuvf/AOt0rTDfZ7XdIY1hXk88f5+lfQTpU1T2Pi5xqQrJt63Pn/4kafDH4oljtYpvKIKkeXjc2O3tXHzxTMxGABgc9+K9W8fXdndpd3sDstzDJwTJt+XscV5u8oILYHPOea+LrK0rI/V8HedFXMgREcIrMV5Brc8Ja/No92xYyGGTG9FPXHf61AZkjLEEAAYJx+FMDQnLLtYis0lJ2ktDSdJuLVz17TvEVpJYJcKjKc4kUL0qePWbK4LIWKCQgbmxn8q8vh1t00hLKONY2UFS4P3vfms+XU7wt/rDyNpxxnivqMHUw9GHuI+IxWXzq1HzM9kiktXBVcybTnIODz6/lT/9H/55yf8AfVeW2fiSWMMXZgTgYBParH/CUt/ef/vo13rFRscry6aOvfW7SJ4o0QAiMg44ANUpPGLjTWt1BDAFVPTnPBrmtItp7+6NtE8as/O6ToK6HxPoL6Tp8NxcT21wZWABjXaVPp+Vfm3MlofSrh2jbmkrtEEHibVBp7wGc5KMPvHr6j9KwPDs6290Lh1+6M5ztJxz71sWVtF5RcEFT8hB4PuP1q74O0qK58Ry6e8cbRBXBD84BGB/MVa1Kw9SjhYzjscZezat4j1USxRbwzkhc4XGegravvDfiOCZGk0kIpPyqh5Hv9OK7bWdJ0Tw7a29ldQK9xbwsigc5kYkg8fUVrWs+jPbPqCSTRXP3WDuSoGPTtWbk4ysevR9nUpe0Rwel3NraSRi7j2SA5JHVW74P1qpcvbT6k84lchvvc5JpNdaGS/kS2jVreNiE9Tz1qirywyI0duFOfvDmulanOnF6o3pI4EgSaKImRJ3YEjg8HvWp8O9atbW9mi1Aq8Fxh3IGdhB4/TFcwuoXVzax27FYwC21gMda6XwN4dlli1HVJEV47K1aQBjjeQCR9eaU9jkU7ztE19Y12yNtc23lsxZisYx973FW5yb2whgJlgCxxqrHgtjGSKy5jZLJBcrGjTXGDCCcEZ6n2FUfE+vrYr9jtZUmnC7ppidxBz0HYfUVyQpuUtD0K1aUKdk9T2XXtds/B/gO2geZZPkxkDJ555/Ovn/AMWeKrfUNfhmtY/PSLIUOcBs9/rWlBq+p63p0Nrd3LSQNnCIMHjrk9+1c1d2FuuqRCeV7ZI22M69QvTJxXXOHM9TxsJQ5avtJ7kf2wTXck23yWY5+Q/dp9tqwtZ45ZoxM6bghJwCT3pl1YBJJhbym5iV8LID94fjzUFzCDFJJsdpOwbkCs/Zo9D601Nxue4fDecQ+Gopg6yvIhU7nyc/xD+dacrJMXbaQOwzyteHaPqc2kWsflSOZTgqy8hvUEGvV/C1/JquhzXjxPE9rGxmV1KlTgEZHvW19D4HOsnxFWvzUnozkPi5a3Lzi8QyGJFzlegHT+eK86t9RmsbjyyG2Tj5iTzW7rviS+1W9AmdYoIy22Ev8hPcgd/rXPas8EqK2AJFIZWH3Tk1jLU++yjL6mDwkYT3NCxuW/1qMcg8cZ4rZ0yeCfP2iKSdm6AthQRxzXFwSzowcFFXODzwTWjZaxPbuHAjBz1yOKylTTPchiJpcvQ7WS3nuJiyLFFCAuF6DPPFZWtXKW6tIuPO6FO2enFULjXruaLaWGz1B71iTPPdOFeQFc8DdWcaPvahWq6aDjctcMXkYs5OPYfhW1odhd3l5bWcEbGSZtoOOg71RsNNaRlAQMX7bhXrvww04pehnVQIIsqSAQM+9dmkUfG53jnSi2dfYWNtpOnWemWg/d264J9W7t+ea8i+Jel41hpwuA5PPqfWvXNakFvAGjKySSsQBvBA715V4zM8uUIBAOQd4PNONWLZ8jw7h8TUxkq3c8+VCHIPbNSqvNXjYu38aD8alXSp9u/zItuM/eFa+0ifpzoyKUfBxgYNTKjbnAPysOKtw6VPLnY8fHXLAVPLo88QRlljYtj+MfjVqpDuY1aE+hlWuny6heiFVOZMAED0r3HwFbPBCiFQojQRqQOmK4fw5pyWiw3r3IYckguOP/r11c+rXljGVtZ4z5y7tr44HXP4iuTF1YONjvy7A1ZS5jpdf1S0sJ0leQXLwDIVeSX7D+VYNvr+mXBkN4JoWdiw3L8ue2fzrnreL7SSZZBvbLbkG7efr2qC/sZxEvm3LvkYCIhHXp25rlw+IlRaaO6vk/1mPJKRt6lZC7EMiuAhP30G4EVWutLViGh4YdM1n+G5bnTLv7O53wSuFdHz8pzyQOuR6CvTJtCUTHa8RTgrn0/ya+qwWY08QnzbnxGb8OYzA1Fy6pnH2WnGP5yh7YB6V2mh2uyHcyAg8YxgfWrlt4fgYFRIjMuG5yvvxXR2fh64nAVJ4On/AD0GSMdq9eliKUY3Z8tjsNjZvkhE8p+MWoyaX4cWIITBcyfMQOeO2azPhh8N9M8X2H9pX5lt59pWJVOAo7fXJ5/Gu8+MuhWEnhZdHuruP7Y86SBA/wAyjODnvjntWR4X8VaZ4bkFhbAwRWqlMzKWDe3Ge9fJZ1i+epeLPu+EckxDofvI6s5/VPBUvhyN0uIJzHvwXVvkYdj04rmNb8bx2FxFp4t0iWJxsGOVI/zmvXNc+KGjalotxA9uS8iECIpznjHPT1/SvK9P8JxeJtZu76WwllijDSBY3XeW6gtuI/IV5OFxSdRX3Pp8Zk9anRl7uh646RaxptrdlWKSwKw3DnpXMXulQ2l4pQAZyWDcg+ldf4f025tvDlkJ7hNyRgMAeFXJ4+oGOlUdX026lmCStEhJySeP/wBf196/ScPjIOCufjay7FrFSSWlzHttNhu4n85QU7t3PHalZdJtIPLa4UkNuwh5UelaNjZRrM9t9qRlKksN27HbHHTkV5drekynWp5DqjPGHYYHygHjkf41w4nFUj36GU4ueltjrJ/GnhrSZwLtJpiSFKo+NvueKsWXxi8O6RKzW9nO5ToPOyD+leTzeGWvL6OP+0on3sP3bSZzz0z611Ou/DS2TT7c288EM2fnIfGMgda8irVpzTaPYpZbWg0uppeN76DXtKvL+3nSUXXz5HUEkcGvKhYz2zxlQAVmyM9j2rtfB2g6sdZa186IW6o2yJ5QVwO3NWvEGh3EN4ZJzbIuRuQOuTjnHH866I4qm6Ww/qWIjU5ZI9p8Y+GNP8X6Fp0V5cTW7wIpDRHBIIGR+NdZoenwabpFnYW6FIoIQiknOQo/+tXC2fjrQZrWEmV4idqbcgkYHJBHWt5fGnheZVj/ALWRMAMpckA8c815V25O2x6LwdRQub9pEZL3zB0AwfauL+OFy0fgqCIcfaLxVY49if6V12ia5ok+WXU7JWY4/wBeoyfoTXMfGHTr/VvCtpb6I1rdXS3gbb5gIxtbvWtOXLJNnP7KT0Z47pRKuXbPyZOR0xXEeKLqOXXSHyQoH413Gm6R40m1yXw9HYWX2xss8bSAnp6njpWJ4+8A6zooNxqVzbC4cZZI2+56D+dehLG0pK1zF4Spc9P/AGatftlGo6PgksoliUHnIxkflS/H+IprOk3IXbK8LHDcgjNeW/B2+l0b4gaZdyTxCNnMTguOj/J/M16t+0NC0mqaPknJhbYwPU56Y7/SsaNSE8R7pao1KcfeJtCgiv8A4Q6lbvGQ8Ugbj3avPdLma3kML7WyCAfQ16N8NmluNC1TS2UAyw70+bngd/8ACvItdnl06/eMkE5YcnBJzjvXVH43cwtc6LSYYri21U3I8yHydhBPqc/0rm9C8F6bqFq0ks88bs7bAp4xkgVpeGYtSv8AQ7yS0eOCWVwP3hwGAzx+tIln4m0qJEFqjqgLMY5AP60mpXuiJRJNW+GFxY6rpllZ63I7Xi5UlOU/Xmum0LRbnwzdahbX1+HZ4lXzm+XcQ6n+QNZ1p4vvbzxTZahJpM5FnCIzGCOT6jmsD4o+IL681eSDesaTKdsbAEICQc5Hf6Vm6s6W5HsFU0Oi+KPiPSZtKjgspopbuIjOO+ev14rM8EeOI7GaKzv5PKhMeFxzyccmuBk0W+a2ExfezLhyFPy+3Ptg5HrUul+Hri8meSONYYsZL4PA9R3z9Oa4pyU6nO1qd9Om6dPkR614ruFvLlLlCsiCMeXgg9e/5GuH13VS7PbSyM1nFGVMaHALHufWsGwu9SstSWyW6ysb9NvLAnv7Y7Vf8WMkePs0SwwId+HUjcT25+n612PEc6tY85YbkqcxsaHF4d1qGGS6823mgUIu9wy47Dtjt61b1Dw3pLWTtLcRxQByFaHkgkDr7VznhWbStQlSG9hRGKkloxgg/hW54gh0SzhszYXEtwxBM0ZbJXmoVrHRr0Of06y06XUYoLiTzYCh2SA/d/3hTtdu9J0nWtNutFVxFBtLErjcw6nrVGOC9tWYxwAiVSuMjIHX+lZvieWEakq24IhW3QkY/i2gn9c0pSSVyleXutmh8Q9XttW8QR31ssjB4v8AlovfvivRPhtbeb4VsVUOZZDuUv0AJzXjED/asCeR/N4CKAcYJr6V0ezOj+GrHZGnlw265PdePzrry5pybZ52aSVKmoxLP9mwLAwlaV5AcmQ8Lj2rG8S3FrDZSJBuaQr94tz9BUOqeJGlgOH3BgQTn+eK4/UtYjjBYkMSO/TFetiK65dz57CUalasl0PPtf1eW2v5zsDh2IZZBnGfT6djVASwyAMEwp5/Or3idrWaUSqUyeSRVDSrbzrwIFzHj5uelfMVrc2h+h0PciojtRheK2j3cNKd+D6VVV1UAkEFjySKk1e6F1qRKH93H8iAdABTQrHGAD35rJI1k2zd0TS5Lu3kYopQsoWRumTmqur6VcWVy8JCsycttORj2ra8P30lvo8ls0QkiTLoGOcZ4/rVaezu/wCzJbhQ+wtx82fl+lfS4eEJUVyrU+Zr1ZRrNSOa57jFLzW8nh3ULoebb2ziMgY3cU7/AIRTVv8Anh+oo9jUD20S5oLol3iVSVJGQDgn2zXeaslg2jPAsTnzDvQMcsDnP8q88kaKyX98ymRT0HPNXdT1aa00qG/MTSJNHhNzA5YHqa+FdLmdz6pVJKkdb4D0P+2ZxLHHKXEhZgxG1QMAHp7V0HiOwHhfU59dV7a4UwYDLxzkde1eR6H4k8SC3ltLa8MNtLktDn5TnrxUcOratMJdHuZDLE7Zbfztx6eldUYRSPnauXyqVHJvRmnrPjG41jVX1G4twnIynZQoA/pWxbXZ1y0ub2JkTZEE2JxgnuR36Vxy6FJud5ZPlb+76VtaTFcaTbS+VCMSptyy5I9x6Gp9kpHo1YulQVKloxFgd5QoXknv3qzBol3Nghtxz91RXV/DeLS9Vu1trwiOcA4TGS2B2zWF4/8AFnm6w2l6CrWkMZ2Ox+8x6HkdquSUEePCGIrVOVaFzQ9CtftEjX7rHFEMshYfN/hXQ6r430y2sl060t444xGEby1wCo9fUmsjR/CmmXukSXIuP9N2EvIG5BrmLSCae8k0ud03wsCshPVR35rP61FdD1I5PLmTlI17y7TU4DdAC3jiGxHI4J9AK5jUYEYsVYtngsa1bmUysLeP5IYSSg6Yz3PrWRqc7R2hjfDgMGyOOen5VFKrebZ6lfDU6dBtbnRaH9m0/TbZ59wj2v3wcnFczqc/mXLsNpSQsykH8MfrUcuo3MtiiMEEa8ZGeawruVC/y/J06V0ufNueNTpxbumdd4ddZIo4g8fJ+b14NWNdtvssJdD948nrmsTQpobcKwjBPXce1bGs6gl5bL8+SRtBrO+p5NWM4VrrYw7K5aK+i3AMUYOmRxkV6z8LdXW5uLtLpkWG5j2SBjyW55PrivHr7bHExXkf3vSt3wRezQaiDHISCPmPrSZ3YlT9l7SO6GeOPCGtaZq0pigkuLNiWhdF/hPTNZGmeF9evGCw6bcOpbaODgGvoC1y8SSYADjJC8cH/wCviravFboAXAXrk9M57mpPnHxniOb2fLdnzJJbTxyMJFMbISCOvIqERRudvcnkit3xOyv4nvJIId9u0reWRjkev0rOlt5JZNyxsz7MMT3I4po/QKMuejGctG0SfZIzGsayYUDpmp9Ns3uGwiGVt3G0dBViLTLsybVhK7lG3d3rrvhlNL4b1SZLvAkkh2kdc9CAKpK7PLxGMUYvlkU9J0O/jkidLWR2YEDA7V6v4J082+m3ClXjZiu7d1HWq174qM0ccfl7Ngxkg4xjr0p3hfWUlvHjmcBHT5iwwM+tW6emp8Vja1TFu1jL+IU6wXHkiYlo128cYz9PavO7qQurFuWU5XnoDXQ+Mbvz7+ZjvZFfJY9+eP0xXKXEUogDp3Yj/CuelD94e/k+Blh6PPLQqtE7vhc45NaGkWDzsFk3+UCN23rS20OQuS6seCMdK6HQLIGLzpQBAT87lscV6tOjG2p6FbFyjG6ZUfQZLC68xwJY1IyxbsacbK4Nw9pbRAxO2RJ6Driurub/AEOQR25vLcLHhSWbOa1YrGEW6SQyxTQyElXTkH8a7qdCnLY4KuNrKN9TA07w+jvbRKfkRizc9Txms34phbO7toLZvIjeLar9flx1/Kuzs49kwCRq2/K7cUzxV4fWd7e5ZENuEMQBOTkgg0VsDTmttSMLm9elL4tDgPCnkNbiS4uyFUbQ4bAFaniDUVjtXFhcLIHjCNtOSuOmPeub07Sra3ub+JzI9uj4jTOGPqRiprlrOzg+yQxbp3YEyN94+3tVww1JRs0gljK3tueNRkXh2G+vb+0illZHe6CpIW9TzmvYo1minKuSyjoPM5OK878OTJL4w0O3EkwbeC5Iyvy8ADB6ZFel+JNV0/RLRru6fdI24xx4OTjuTRgKNHDuUmLOcwxuI5Ypsra9rH9h6PNqFxJ5bqh8vLZy2MV4ZqPjPxFeXv299SuggO1dkhXAPpV3xhrmt+JJl3zyyQZxGSx+Yf3SexrD1K3c+Vb3SeVEIySDz+GRWGIxKryahsdOXYSpRhz1Xds7f4NSTeIvFN1Jrd/Pc3UNufLkmfIXkYr0qDwhYz6nPN/abw3agA4AKudoOeR1NeQfDzwxqOt3gkit1t7KBR5zr8vmKD09yf6V6d4y8QaPpd9aWLblhaFB5obONvA6emMH6Vx4zDp4VtR1O3BZlWo5gowm7duh2vg7TtE1XTBb3umyWs8SGOeR1AMxz2yOnHarWuWWj6XYi3sLdbG3kA3zA4I9ufWuc0vXfB6aTFcz6tbPKg3ojYzn/GvNfiT8SrjUlew047rXK5JGAAPevMyyklWTkj6DN8ZXq4aShN3PaPLUxqNxcBRg56jFUtZtw9m5BYMBwSScVl+E/FOl6jolsZLqG1uVQKySHCnAHIPpVqTWdG1CT7PZ6nBK6ElgGx8o789a/QY1aMUrn4u/7RhW6lXRdMWF2uZmMqNyW34CEjqfWvILzUoH8RX0Mco2HiN+QCQfc16pf+KLayt5BCiqdxzLjjb0PHeuLe00u7ZZ5I433MX8zbyf85rzsTyyeh9Vl+LxKXvNmF4Rmih8QtcTKjFl2gkYzjgkD1NSePIpp71ZNP1G5LSEfMzYVB71nwSpYeJ2jn+VRIWXPQqTmtzW9WnktnvTbRtGAVjDkgY9RxiuZU4uLR6M8RVjUTuyPwTa6rHdS29yqytAg3TISSc9K3/ENqZoFkkZCQCD6nIrS+Dmm248OSajdRlGuZAYyR1wea2/HOmWVhpFzcyNCN/zrxjA9R71UIKMDhq5hVeItzM8l/sSeQA2zlmY84aprTRZxLGZkI25+Vs+lcrfa/q0908Ud7O0IbCjeQMdvxroNA1XUkzJdXj+VErZEj5DE9B7muNY5KpyWPaU60afNKTNmfTZbZVlO7aTxgnj/wCvXQfDi+nttdtGnncwq5ypc4Bx15rPiuJLuyW8ZHCtGAW/gPJ6VRu7OG7hij3MPmL/ACsRz+H1rrmlKm2EKkpLVnf+HtTsoPi9rF0bpEjRBmRmHUqOK4f40eJLXUtRZLO6E2wfeUZBNZsfh+18798m4k/dLZ/Hms7WbcKsaJAsKgn8a836vbYp1Jdzk9HLW+v2lxv3bbhJDk8cMDXtvx41/wA/xZ4es4pAES0STfx1bj+leM31mY3ViBkHcOO+eldT4+1bT9X1rSZLP5/s1lHHK+OGYE5H4U6a5ZmzquUdT2j4Rx2015NHGzlPs5Ab+9yK47xh4XtbvxHM1wJI3iJVVBHTOc9OetYHhDx+dK1WEs/lyH5FVPugV6f4oS0vhDeW8izXE0IeU5ypz2/Ku2hKLqWZgkcvolnBY2f2SBmZC5ZixBPNaMyrNEQQgQnYuDyR71RitJ5HKHdFKpbJB+UDjHPvVS6a4tMQSFA28vsbkHvkHtk9PQ16KpR2TNPZ8xLLYrY3DXEKkKikDd3ryfxJfSalrkssAE4DsUVfXv8AhXp2o6yLbRLuUs43IREhIJ3Y5/DpXL/Cjw5Hf6fq2s3jBBbwtFllB5PJ4/A1w46N5KJKXs3c5vw/4j1CzuBa7FljZwWilGcH+ddJqnie/tNNOhw2tvbRY3M8Scv+JPSuM1RoBdq1k2ASSOPunOMD8s/jToL+W6u1F1MFiDbSx5wBXmONmdHNKSuFq9yNShuS5jXduZ15IwewNbvikzalfLb7GYugaMkY3D/Oas+IdJtB4dtruCLy96mRSDyw3EZP4VV0e2mk8OJqjKrpFI0QOfmwMHn25reMF0OWdRv5HLXWlX9oTMqyLHgEEH2qbQLuePUkVA05l/dshOdwbiu803V7WezW2uRGDz5WT39AK4zU0tHurmWNPKIPyoOmR1/WrlTVNaMzpVXOVmjUiu2W6jAjLkKzcNwOx/nXqGl6Homt6Na3Emno0FxAFYYw2VGCR9cV4hqTwmEGJpQ6jueAa90+EN9DqPguJ9x3wDYwc989q2waUpNM4815oRU4uxw0HgzS7D4k22mmR5Lb7P57ADB68LXW/FPxI+lWNtpUYAjuF3PzyBjgfSs3VLhv+Fw2z+WiA2gXJ7jJ5rO+PShYtPmRFVjkZHU5rqUFShKSOGM3VrQjN6NHMz6yqwkxys8ZHIzxXPT3ep6izLaws6jjgZNUoCJFwFdwD8vtXqXweW2SZo5beDzSuBIOCP8A69c1GMsQ7NnpYidPAx5oROM0T4e+INYHnvC8ERGC8nANavhfQlu9budIhuBL5KnzJY17DsPrk/lXq/j7WE0jwndyxRkTKm0MDySeAa4P4BTqlxqs7DdMxQ7sZwPmznP4Vc8LThNUzmo5niJ0JVWeVaxYvpurT2rJgxyEdO1LE4OA+eK7P406c8Pid9QHKXIBHHGcdK4q2JbrkYOOO1efXpOE2j6HBV/b0YzN6xOLC6ZCdhjz175FVTqdyFCiRto6DtUkMU/9lTrA2QuHfnnH+TWXuzXp4aq4QR52IpKpVZvW3iK5itkiMsvy54BqT/hJrj/npN/31XOMT2Un6Um5v+ebV2/WZnK8JBj5pmeVt5JPfNa2pyMmgacrhZUkDFFPbBOf1rGlcPKx96lnmLxQwtkCMEL+PJr4tI+mU7Rs+ps+H5RH+8KqGJwMjIxUsFzbS6pcSMu0R8cfxfWsdZmjtWCHHeqUExIOCcnlqpGT0Olg1INKHjkxiXCg+n0rpD4jVrRYZbSCdeASOCK87V9rxMMA7vSu80pvDc2lxx3AmjuSPncnvTcWzRTpr4439CqbtY7tbrT5XguEcusm4ZUfWud02UTaxNLMUclzuz1Ynr+NbN9a2UMc0tlevJlOrpjB/OuNhlK6mrh2Z9+Ris5XSsUlBu8VY9u0ldPt7SMRSrGsy7XEkoDdq5PxPY2lh4oWGzuZZgU3OWOeT0GR+FU7DxRNYxyW9xawzSIAI3kbGP0rIN1Nd3zzOcmTk4PFcyoyZ0SrxNff8zZJ3YrO1xlNoFGQC/ynHU+lXCXaRXOMHuKzdZnMIRSdwzkDtjOc1rTp8rOPE4jnXIguElh05UJcA8jK1zzgeccit+IvcW8SGThpAoWoPF2npp+tGKM5jIBGeoz2rouk9Tz6KcbplC3MobCngdavG1ndN3zAA4zUFmo80Z45/OtdJnCleMHqKU3bYwq1LPUxJ1dcqwYj061q+EBJJqUUcYYuzZA6cVFdAEk+o/WrfhNki1yCVv4V61N7k4mpehJRPY7O/CWCsWO0EL+FQ6pcPeaRexW/zSFG2qDg4xwee9ZOoajDbxeSm1cDaSvPPrms+21NBMRuyjH5qaR8TSy6UantbbM4Jo0a4LSFldCQyP1ojuYUuiQSEVgQF9e9S+JWX+37xl53SkhvWs0Lz2o5T9DVRzpRT7HSS68ss0Xlqx2HjoM1Lba6665HdXESoIxk5Ix0x1/GubgyJFOO9aUMLSyoAQMjLE9qTkoO5eEyyjVi2zoNS8WoxYxBc46EHFWdAubq9hmvJVYRYwmM5Y/4DFZNrpsN4RDEm7IwzevuK7eCC3ttMjhgQpGgy3OTj1Fac8pdDzKmCw1F6dzlr5fMdVZjhjk4PH40yCJ5WNtGA+BvGKZrM6wZSGQFmfGAO1bfhjT5biIzXEahScxk9R+FdOFpa6m+JrJR5UJbaWn2dvLy827IB6iue+IOpz2FnBYW6yRqATMcEAk//WxXodrY3BnJ2rjcBhab458OwXWil5YYp/L/AHm3dj8On4V6GIXLDQ8ujVSqrm2PBLW62yCRlaRuTjmvWfghrD3em3mmTZKoS6AnOzPYVueGPD1qtpB/olhDBLHulBTLDjoP8a5a4ubHwp4yunsvlWRVMUXTkkZz/OvHwmKdOofR43LfbYdqJ6vAiWF6s3AZccN79615HhkljDxeaD1DcHd6iuQ06/GpRNKyKksbDzFHP4itAXTKQwHPOK+pp2qRUkfBexcJuMnscZ8SdHfTNSGr6ZKYUdv3owG2HpXJ6Rb3HiTxHDpumxmV5DgyMOF969cuNRZbR1mZNm0glvfp9a4HwwrWurSjRw8Rgybi4xgKvTj86566a0R6uEnHZnrOn+HvCfg62gZriGfVIFyzyHJAHJwPTrivIPirrEmrySXVxIUjXPlopwF9MVb8R6xbfYg8UjIFzvdjlpOa8/1K7n1Biz4EYPyoT92uSpGNNa7s9alSlOV2P0XXfLt2jaEl9hDg9HHY+xHByPSus0zxJpkVnHGuiR3l0F+ae54U+wHFcNaWrgCV4gCvOe1b08kNvYi5yM/X5s1lh6Ps7ysdVSCnoyz4i8f6zLZLBHGlhbIMNDagICfXPWuQ1GTU7uESXMkhgJ3KDnIrQit0upPNuV2o/II7e9dB4dgiunl03UNgmbGws3Dr2I49KwxNWqltoZ0aVOjK8VqcPBZySuGTdnpXXWHhy4ktmdgSduQpHANV7mC2stXMUcySKDj5f6Vs2HiJLeQ280TrHtAMg57d6dOrGFPnS1OipKclYbHpktxpf2W9AjkGTvjf7oA6k1zkWj3wnBtbuVogflkRypI9Tjsa3df1C61LTitnCVtkOXHUyepHpWdaaitk8aBm8g8bDztb1+lY06tWpLmkZxoxSN+4eW40EWDefHIild0h3bs+45qXw4xjURzP8ka4LA5Aqxp8tndRxiQs2QdxB71BerFDJujkMSYw4HpXs875ThdBK6RzXjhVlvJLxZ2BjQAY/i6AV0/gHwpqvifwy8pv0ihDbUEpyCR1/mK5nxLp/mTebHPuhl+6w6N+Hau3+F2uXOkad9gmeJrcncU3fN/wHisqfxEYlNU1ynq2mxQ6bottp9soaK3wMn17n6GsD4vzq3g+dnt2kjCjgHlTnr9K1PtqXscV1buGiYfIR+oNZvjfT59R8I3caBjKynYF69K7qq92yPKp0bTUpHinw71XRrbU3t9RtSfNkCxyFN4B7ggg+1ezax4K0OeIgvCsrKHVMhc45UbR07DjrXgFtBc6XeqbyBo2jlBwRg5Br3pdRGp28WqJLE6eUrHcnI+XnJz1zXzVWjN1j7KlUpSpX3KVvZQR6VcRxBRGp2+WhbaCPQE1RXMdovnRrE6Dh8YrQssWmmxwKHYSMXLemSegpskK3dvlgfLZcgnt9RXv06UvY2PK2bsZasjncWV2IznNU9UtIrggM3zKCcAipprV7dwwKkdhj9aH8tWwVOTjBxz+NYTpyirgc5eaPcSRkiPcvbnNZLaLcWxyVZcjP/1q9D02/gSUxuoDZwM9K5zxZckXmEC88dKhxTeo4xlE5O609GhM3PnYyqgV6T8PdVaSKK3y6sqBH3NkY79a52ztWvYjGEOXPPGPwrWsWtdHRxKhjbIIOep9K0hSs+ZGkTv4ZVeRoY0B3cqT6fWl1LTrea3V3KlgpUMMbhnt+VcJqPiPyBG0MjGJsDcvJzV3R/Gi3EcqzytiENtyMYIy2Pzra8r3TN4ySOQ8faibTxLDp9vi48kJlMYJyT8p9a7iP/iQeCp4WUNc3KM0xAwN78H9TiuV+H6p4p8f6jquoup8sBo0xn1AP4Y/WtL4wXEmn2FnCFba0pbax4ZQD8ufyrBq95szre/JWPJr1JIJ3iYMkitzx0piMHYryFAyfWr+rvBM5mh3gSKp2t29s96y4Gy4xxuU5rgTubq8dD11JLaT4f6LFLGpcB4nP+wSTn8jXGvq1wl9Ppa7IoJuP3Y4Pvj34/Kr1rezPoVrbwyhgqnkjHPpXP3TJI4kfiWJue2R/n+ddXLaHMji09o0XJEWeUI0MihMlmU9MfyqjdQhiqSMVABZSD96ppbx55HlRischDspGOM1amjj1FI1hIUoCuSe/YVUrzREX7MyIrUO+5nbacHrXs3wis1Tw5eWqs24ziTPQY4xivN9EtBPKlrPgMACB1/KvRPCNzcaXqkkQ/1TR/Kw9QP8a7MHQa1POzKvGpHkZX1uxnf4ixXEYwI7cKq9e5qb4j6b/bmgZhj+e3TcCASVArRu3WbUReFx52MZB7VWaVxM1wXB3/K6k+vUV3+yunE8P28o1IvseKaKmLgwSAgnIxmuw8IRy22pMqyeWVOcZ703xT4eig1J9R05maNuXXH3T3xSaTciG9WNJRkkHpnisKVLkdj169ZYii5RPQdetxq2iSQXRKtJHjJ9uRmuY8B6Vd+HdYmcyCS3dB5ykAEnnGDW9Fcld8kTbRjgN/FkU1Lx/KMLgK7sMNjnHPWuqdGNSSk+h4tOtVpwcOjOW+KJe/0mO4BfMUpxwOBnp+FeZxOok5478V65qkPm2d206s8KLt2gcN2DV5Pqtmbe7khVgyhsqR05FeVmVBpqSPqcirpU+VnXeGPsC3TrK6Ossflhee/c1i6xo89jqk1oimQL8yso4K44qnpcklvMrLltpBJz0rr4tQhvbSVpdzSoOpPASurCxjUppPRmeJnKlWc1qmcXJHJC5VgVbvTct6n86t6pJC90zRZ2k1U3D3oas7GkajauRRIXmbGOBnk4pTK24jBPtXU6NpFtFpEl/eQqzSEbFbPI9axdTs7f948GEA+baDyBXyZ6kcXGcuVGdK5kXAJVe5xzT4wiKRnAx+dMiKs+3kcYyemf8KepdWaORVcgc8UHRa6uDFlC/Kp2NnNdjosfhq4t2+0zzrcE5UDdjb2/rXIwb9+zYWXpj3qfS3e3uHnC7tg4B5ANNSSd2Zzc2rQlY7C78PM1tJdWl4phZDsU8MxHGOK5KXTrmK+LArDJHyWOBitH+2biCCK3SQqWB+Yc8E5/Csy6uZWmKbmcbuc/1qHZvQwhWrJ2m7iSW1zPKxmkBkdvmyM1eixawGNSSR/CMA06waOPEskbGVuNpPGag1WVYrrKqyORzznNIyqVXKVi7ZSLNEqGRomPO0g4X8T3qj4hQCZEVm3gZ59Kkt7nfGSRliRz6UzXSTdRs5+cqOnpihDoyvLUi0i4aK+t84O1wxzU+v3D654heaLJMjBI4+55wKz4mCzr9a0vCt/BoniWz1S8gFxDby72jVsFuDjn6805bXNrpyLGq+HtY0JoW1Syktd/Me8fexTF4QseMfeJ7V0XxU8Zx+Mb61ura3kht4EwqO2STkknp74rkYhJ5MiAnMjA5pJNq7OWtGLJrg4XDDG7kGjShIt0VhBaQxngDpVfUAZJFfdyuAw9Me1XtBmNtqElz5ZJMLDr0zxn9KdhunHkL7Xk08URMn3F28Cn2rSCTeysVJzyetU9CgkuLoWUa7mLYGTwK9L0PwjZxwO+ou7TghkjHCqOuPerirxPPqcsdEeW6vGranKwbcoYgGq5Az7V6N4x8GBw1zYLskAO5R0Y+w7Vw5sJkfZIo3L1/CtIxR20q8XCwy1tnZhn/Vn9K17ayadhEoIjH32Hc+n0qbTNPlLBVHTqD1NRQXj6RqEts7bFH71AyZJ/2eta8kbbBKvO1oM0ppm0qEzIqkBMFkYHHtU+jamt+2oW0dxuVBuiYqR5gzyM9qx1stQ1u5mk2iK3YZVAMEkitRLCaBoILdPKCxASHHVvWplRlLVIwg6ab5tWQ2ul/aJnll+Y5+XPY+9dzocZtoBFIxDA/dC9KyfD+l3Mc7XF0wdmBKgjofWuntLd/KMrYVwOoHH5V6WEp23MsRUTRNHIgf72Mjpj+lc34s8X2FjZNBvSTOVbHPHcD3+lbOsT29rprz3LMsRXKkcMx9B7V4X4rvP7RuJJoLZbaPftRADnHr1pY2so+6RgaH1id+iPRdD8XWFpYtO80SBVIRSfnPsO+K4HWNYbV9Xku3Vn3uNuRyoFZEcDlAWYk1dtbcvtPyqo6GvEVNRbZ9X7R8iiemeENZ8q6O1Hlt5ox5u0DII+tdSmo2NykjpNuCgnbnBTn06ivL9IaSztyvmN5S8sBwSPUU+08Si2D3BRQ7vtOeMr6/gcV6uCx7px5GfO5lliqy54bnT65DfapLG1tcJGkZyoJJyfw/rWN4juX8OaONGgvVM1wRNdupxn0X9Tx7Vmr4sm847HYpklggwM9M/pXN+Kbs32qSTeY0kTcru6gela168nqRgcFKMrS6EF9fyzvl2JQfdWnWUkAnj+0cJ1b/CqUZU4yNwHYGiNbiZ8JGxZugC1wRdSU7nuOMYR3OpvNd0+LdHHaMykAYxj6Vh3d+12yI4KoD0HpXSeE/AN3qsga4kMMWASW5P5Vo+P/AMeh6dHeWMjTBf9bkYGPUV22qct7HnTx1FT5L6mLZeVcQ+XkqOAMHkVZni/dC2udyjH7uZGOU9DkdvWuc027aFjhskdvWuhs7tXj3ZBO3lW6ZpxtNWZ0Si4syLWBozdlJT9oQDawbnHfHf06VbsZJHWVLve6Oo2eYf4sjoTS2kMVxfQ3EpDO8xQhuBt/CtHxVZwaa9m8ESDeWJZWyMc4+ledVShV5Oh1xrRjBxtqzodESJ7A4UDAx24HeuF8WiO11BokYbG+7joKvrrDx2ohjdVBzk56ViaiTdoQMbQc727mu+rCLjoc8E03ct6Fq8nlnc5V0HGOM1NPrM1xJhizr2Qevqa5mMNHOADwSAa2tMRYpVZyGz1PtUU6kn7opU0tToJ7eSPw7DfxS+cAds0R6xnsceh/rVDTLtyCTIylTuXBxj2rbtp44ULRqWtpkMc6HsMYzn9a5iNfKvpYYmJwfl75HatZNwZhOKkrHrnhLxJb2+ivcT48pcblC4O71+ppdT8cu6+ZZSSEj7uDtA/KvLorhk0u7jDH+FsZ98f1p2mzSBN7Y24rpji+ljz5YByvJvQt+ML691xgJFzKrbhICM4Paug+Gu+Wf7Fd3rLbldvHGfqPWsCORGkLrgNjFPeSW2PmW7KhJ+bPcV5UsU419j3KOXKWGvFnquqSBTIIpURIgNhC549KoNeytBJGV3M7nYnAIHv6EVW8L3DamiQyODLEm47ejj1rYl0m2Fws7Od5OWx90n/ABr6CnWjOmmjzKUpRk4TWxiJ9ovJYooU3uowdvUd+a1b3S4haIWj8tuo461qWS2kU++NFDAEY7mrGuvE1nH5KgyZzyeBUT95aGraTOB1GCW2l81zlWHynGMVRmit5UBuWJfdn0P5967SXThf2ckcrZcLlR2rj7/S7yaJ7WOIg8n5j6elc3s2aKV9C1o00MbBduwy5y2fl9c1zXj/AFGYnYVc4yoZewq1ZedDIiXJG+PA9QR0rS1DTra+hEhVsbf19jWrg7aGvs2cdojC6sQztyoJ5bmn2c4tZpDcSyuSGMYUZy2DgVX1eMaXLKyKyqDgL6is1tVSc4ZTGRyGHrUp2VmVCld3Z3nwbsRBfDV1nDCVnjuF3YKnjGPzNanx2hR9OsHhcFVkKsM529cfSuE8O+JG0p1e3VCMgsCeuK6jxTr6+I9GmKxKrMgkyFwC3f8ArWaj+7ZnNcsrnGy2kD6QXRj5gA25A5OeaxIUKsrH+6c+1bmlIn9nzNc3Ai2LmMEZJbsPYe9UE2kyI0XzHp9K8tOyOtxUnoa3h4NJM8CE7UiDcnOM0uoafvumcyAFjtIA6D1NTeEYExNNIzDccAn0/wD11pTKF3hcHPoOtepCnzUrM8qtU9nXb6HMwvJLDFuTB24BPGaWGVraTep4DDNXrwhWbGDyBtH0rPuVIX5FB749aFHkWhlKpzts2dH1dIb+NyA79BXX2szTyrJGwJyNq5xj2ry2OPZcoWGPUiu28PXiBlhDHnua68PV6M8/FUdOZHQXSSxXWQ6uCMfKc4qteXrwKseNpYZwTwDV23kjeby3UnPTae/+NZXiQXBtJJLePzmbjAWvR5+qPHjFyqcrKmp6+lppbwyOHMw+YEDg1xtpeu92rINhZuGA/wA8US2N5NKXuWJb+7jio4ZYrUIhjG4jJNebKpPmue/SoQjDlT3PQdK1ETQqpckgfNhc5NV9R1S5t5XeGcSZAAUEHFcXBrTRfKCTu7rVqS6ubiHzIGCkHLZ64rdYhtaHJLBWep0svitYbZYZo8SDKldmQa5HWrj7annNA0citk8EDb24pL+4ZtroAx68joamg1qV5DHNBGVI2njkVFWaqLlkdNCkqWsTMsAwdY2UFTwTWgr+WWjEiDcCuT15omjRA0kZIwMKvSqfK3e2RM5C8H1xUU7xVjbVu7GjMa7CFBBPOAaN3un/AHwKfeBnmxHGcBRUPlTf88j+dXcaNzWL1kijtkH7uGJVPzZGa5m8uGkkYA4GcZ9q073BL4UqHYZHbp2rHfG5gOeeCa+SR6kIx520h8GIz5hG5hyK0LfUNqMoj+ZuRtPFZ4I8sAdR1p1v/rlpmzJRdnzMuMnd83PWp7eWNbaXadoJGVyfm61Rk/1jfWljyImw2ORx60ibpF27ZGtYJ1REVfkCg8ketREKWWbJ2suc1Y02EtpN07ojFCPvHkcjkCooyj2RQL86OT16jjj9KhHK58z0JYblEVZSN+3gKTjn1qnMJpZixBO7oKvMyBeIwARnBXt61a8OWpn1FX2qyKTjOcEAZobsrmcqsYJyZn2LmORoWUfMcZPan6o4d4yQRtGMnvWr4pto7S8SaJQoPBwO/eqN4UltUOxdytnIOeDSg+ZXFTrxl7yK2nwB7yMNyCKjmXcAcZ+Y1ehCKyMTtz8p/wDrUot0aAkAq4OK1RXteWTKqL9xDgYq5HhUBO3J9RVeMHzACed2KkVg6hRwAcfSnIwqPmZFNhznjPTjvVzQIftGpJbNIsSyfKZH+6o96ghG5jwOhzmup8I6DNdyCSf/AFAUgjGNwqlG4ru1j0PRPD+l6Qy29mTKHHzyIcEsOwPb1/CtmAw2l8Y5Z2V3Afl/0JNcJoutPosiaVqLNLZl2NrdHgtngAn15rqpRAkgvWVLjy1XJkOdxPTpximkclWLvoa3m291eiBpcB0JCkcMBj8D1rmfFPh+0SF7xZ4UKA4XIHGf8O1T65rWmaZps7XjbJCuQgbJcnoVPoPb1rx/xF4l1HXLoxJK5g52oCM/jj86ouhh5zl2Oj1e+ktVNokUM7Fd0RQn5Pr65rCvLabdHqTbmkQAyKRk4Hp+FP0ljFaqZCTMD1POBXYaNaQ3ttIygFm52sOD9PauulFNXOjSDaItPjmuLdJbUMA4B+ue9bGlJMsBjuJB83ALH5hj61V8EvPai80WdYvPtXLoTkZjbnH4c1q3EElyxlMY27uCgrspyvuc9ak/iRZSYW0YLEIUAwwPDU6HWbdAoRNxPLFxwfauS12a5LlZd6hQcAe1V7OUr+9O98HoTwPpXRBK+hNTD3ga3xCvgdOY5G4ZI98npXlupqym3jcjO3ccepJ4Neg+MgbiCGIgFiAx9R7Yrg/EabdakT+5tA/75FeHjH++sehk9PkptlYPggY71s2hiSM9DjoSOpqHRNDvNTnjjhT73I9cVY1fT7jS5Ea4iPlsxVeepHFZTi7XPW9rFuwyW7lnVd7nyx09vWst4zJf7zJiLfyD6Zq3b7WQ7Tld3HtUd1EvkOQu5g/I9KVNLmFUvbQ2NNm0uKJg5RJD0OP0rM1S2geQSCMfMPkZeMGrccdi3kywjLR437eR+NGszRTIAiDK/wB0Yr05W5DzFeNTQPD+jaZNcJ5rPPJuwU24A9zXd2a6GYR9ljgGAyEKOQeK8uhvp7QM0DNGzfKRnJIqTStUls367vMJxnOQazhVj2FicHUqaqR7Z4ekW108W0UZbc/3iM8E+9XtXjFxp0sMo8wTIw2sMkDp+FeV6b4w1CFkB2yIGyuf4RXX6d4ls7ogTT+STnGTn869GnWpyjZHzuJwdWnUUzxm9iaC+miK7CrkYHaprYXEgADf/qq74ziWLxHdMuCC+QR0NUEmbb93j2rzLOMmfXUJc9GLZYsk+z3kczygssnK5rS8RO12IEDEhehzx9Kw0WSV1iGU3tgnH9a3NXtXsbWJ5LlJgH2bVGOPWuLERh7VMV0pJmKkDLJ8+dufXrQzMRt+6APu1YmcOrZ4UdMetVH3blVQSzEACu1yNr66kRjaR8J96rFvKVGGbn09K1bvTpLe2ifZhQME9/U1nSQeZG0y43r1HrQk4amKrKeiNqwvyLV4du/cOOaikVNy3CAY/i9z6Vj27M8gjTcc9cZq/G/lu0cmduOB1yfarUnNXYezJWkAtpEY8ucYqe3JkVM9QMce1Urpg6DAAJXNT2M7DBBACp2/nUc1mUrqNiVWf7RuXoKuTzebBkDjvVGJz5x7888VaZMpmLPLc9xXBUd5NnrYaKVOxf0PVGsb+GZGKYIDgH7wPUGvXAJpk81HABQMqnkfUV4qsSvEGXrGecDrXszO48PrHED5giA4HQjr+ma9DLamjieRmlKMZKS3OM1nUrhdckgmnZIowAOcheMnj8avw6oqNFCbhWST5Q2flP07g1Ra3WW5nluQGRsOCR0wMY/Sq9hYpLeLIbeQOrHZuHyjPp27V2e0lzWuebDW1zr4/PihMkUhdyAdg7r3+tXnSPUbeNseTt43dCp/Cse3S8jdUHLKxK57Dv8Ah1PNUdUuJreQ+Vdg7zyW4GfTA713ctz0uVPYy/EGmS297uKvszgunJA6D/8AVUkNxaxWZEbb1GFwQRk59DW5YX6Tab/pYy3cMcMfw9vasLxRBDYrBcwsshddyqOjDJ4NawVtzrpLozj9Z08X0bvGzbUf59xAJH9a5a7t1imIQkp0GetbklyiPIH34OQMnpzxVW5xIxO0HPfHH4VnUw6qao6PZXMyBxburqVY5ztNaZ1edtkfnExtyU54rKu02SAlcH6cVGJMfdw3vXE24LkZjKCTszRn3tLvYYV8gD8KjtbvbKzygScBQp6YqN7ktCiggke9QDcblG24AIznpXE6a2Od1FF6HQwTPBCIoyQoJNWYb9gAHBY/zqtdMko82POSBkAdKyLl545tnzV2RnyxseTWi5y5jbkHmyFgAoB546VFLHiJTzgEgcfj/WqlldP91/Xiti52tp4II5NaJ3VzCf7tIxLk4kFaPhi48y/Ecg+UH1qncRFx8vWn2NvJBNGyOVlJBGOlTFe8aSjzxsdySwKMGypPG3NXIpImYo8hAOd209xWLpGoT2zyW9zGzoy/IzDoKGuCCQPvbgcjvXpRqWR49SjaRrXaQEAqoYgZxXJ+LNIZlEsO3jOVKcir9zc+XKpaQ/XOKmi1WLUN1oRtJ+XPeoqyVSNi4c9JqS2PN1BDc5yD0ratpRLaomdhUYG3sa1dY0FfmEKKD13k9TWAlldRqwZWAzkY7+tcai6bseqq8K0blsxFpCF+YAnIH9c1RuEZJ2ijIGem7t+NXY5zG+5u4w2e3rVOeQPIW2ryODnsDTnLS46cV1LwJJRJx8uc+wHtRfxxTJm1K7gc4zyKppMVwJDvXsCehq1HbSSI53hVwCW7kDsO1bRqJolqzIgjSjKFWxweaPs03ov/AH1UEPmfN5J4zzUn+lev61V0CGT3azFXYdev4VnIAxYn1qw0EywqxQhegquOCa+RjqenCzWg/AApAcNkdaQt2qa2QO4J6A81TCU7LUjijeVyF5x1qzJCY0SPAG8881cCRROXQAFlyAe/PSmXYR74bx8qqFGFzk1m5aGPtDdnsrPTtBSNnzeSkPt7bNv+NcpBMFklB6spArotcneSOJpowGSHGR3HTkdBWNYC3a4wYwRjPPrSRz0ZOMXJiW5uJ4xawRuXc4x1zWxpVte2G24khCosgBPp2PFM02c214su0fJjDY59D+ma3tR1iB7W4ggjaRZG4yNvJAH4UPUzqzbXLYo+KnBs2jVfMOQd1YVvGf7OuFzgkBf1Bq/qM0jWKKQRvxk4OeKjtsmwlUBeDxleT7etEFZWFQhyw0MxFdZFkU428irqTZYqvQtkfSo7ayu5w0aW7ZHJyOB7Zq1e2SWscQQknADk9ATWycb2OurTlJc7Ke47sr2OTmm7SWCrncTwKmaJuMDdk44+uK774feDnuAl/qMREY5RCByPU+1XCHMzkckVfAvhF7t0vNRjKQ4yqkZyQa7vVdY0/Q7Lygg8wDCrxzVHxP4jttLVrOwEclwPlHdI/U1wGb3VtSZ3LSFvvse3+Aro5ew4as0Gkl1O1uJpYklhYkNCPlMZJ4cH61BBrmqaHp89rNGby3ZCsMhONrY6V0OnQWFhAd0habGDg8EVma1aC5t/OikEkBGACv8AEOx96h02i0nCe2hwF9cX+t3e5maQKck5wqj0rU0fT4oIwQQJMkH2/wAipbyBbQuIMBZBuwASAfxptpKC4SBgW25YMDkUrM7J1bq0S7b7hcy2siqPlwuP4j6/rXbeHbaO3s1WRSXI4J/hHrXLWVgZW+0Ybg53kfpW1ea7DBpiBlbcDjcOtdtNcsdTldFt3Dxdv0vVdN1mMEJ/qbhlPVCev6mt9L6OaJItzsDyD61y11cpr2jS2h4LLjP+e9XPAt3HcaU8F4X+1Wp8s7lxx2P6VpGWo5wvDlL2sNbSTLbyHMhPL4rOt7Z4gJHAES5JOPy4q1cfZYpUlknBbP3f/rmsrxRrMVrYfZw7GQ5zsx0Pr+VOpV5InNUjKbUImL4g1Uz6ui28gCRnYFx2rB1zLanK5OSwByfpVWCZ0uvM+UktkA1f1JQWDOvzMucemfSvGcnJ3Z7GHgsPBR6npHwp1jT3sUtXTdKuFLkDK/8A1v8ACj4pWtvNCDEyGWGQmUKeoPcV5XpV5dWV8xtZGQspBIq7e6ndShfMmLN9a0lO6saKFnzdRz7Y4yYhgDn61E8TtvdsqduQM9jVRrqVmXcQOckADFWWlwpCAHOQfw6VMVZjUpdSCxk2SNEeNxwTTbi4zIIR9xTkseaLyRGZRsChlzx3NVgc1u6jsRKCbui9AUbcTsznoB7VA8HyPIueDkcVHISqZXqasxnJdDyOKyTNbFeN2WXfyQGPHqKu6ffypcNlvvjbkD7oqO5VNkmM5VQOPXvUUbhWRkHXGRWkKjg9DOdGE1ZlzxO6TTwTISQYwOT3Has+MYOaW8uBLtTbjYTTN4Ixg1o5czuzOnDkjyk5ciMkHHzLW/4knjl0VIwDvDgnjrxXODlTnlcgmt7VYk/ssuq52gEHnua5cQlzxZFVaowU/wBUF7daWAA3sC85LjH5imhucd+3vUkFrdXLpJboV2Hdubj8s9a6ueK1ZrNPldj0nxFpSyWSNG2GMe5s854rz8QOtwwUHjg8969L8NXT6p4cCygebGfLBByc/jXP6h4dlWR5IiCDnkjn/wCvXRUi5R5keRh5SjJpnG6MivqLow43EAfjWvqiCKZAjD5SMADpWXY7rfVHWT5G3Ec/Wrd9KWuOWyuckiknaNmen70ndEtvp/2wmOEncp475qJozArbhsYdu9SWN0baaOSMttHPPXFa09qNStmvNmY+eVHIrNcrjfqZpyjOzMDT5t77CDwetaMLETEhxtB6A8YNUHWGC5PlN19TU8Uiqzcgg85rgmvePaw0k4WZpaXCr3aKxGPNUtk9s133irWY9LsZGt5gJiMKmc44615xDLtIeMYbcD1/pUl68rnezb8nndz+tdmDnyxaseZmMeaotdBLHxFfJdPLdQLOjY6NtNd34RurTU3E8TCJlJcRsfmJHU/hx+deZsIwcAFQTz+NNtr2506aJraQgROxyO+cdfyrWFRxldmEqF43ie+SXNo0/wC8ATKhgM4P1rF8S2qIvnj5lPDqBnPpXIWutNqtuZYnYmPBdW4OB3FaWka8Y7pYtRdpUIK44Zfb8a9ulaUeZHTQpa3RBeSxfYwbdzIe645PPUntVEXMtzH9ndo1UAkZHQ1tavYRBzNZzll2EqcA5+o7GuSuVkEWxCcZyoHBDfWtabUj0YruZut28SJuXC9sAd/Wsd2niYhRuAHNdVb20VzEyzTKpIBYbgQvv6flWNrywQJJ9jYt3ViOo6GicFa6NlqZnlm6BKk7yBgA5xVeWBkcggnBxj+dS2G+K2abLI47f3q1rN4ZgFZQ7ZG7OQAKh0VVjd7lumpbmK0kSpseP6EU2MjzCc1a1iy8m4keBSyFsjA9qoKx9D/3zmvKq0ZU2edUo2eiLcV9NF24qzFKJl3sfmNZpyRjaamgVkAOCAeTTSb6HHVw0uW6RZJJYjsDxTzfOkZG04+tVJZP4VJ/CkWQhMHkUc1jk9jfc0bKcyoSeoNTQSoswB3KQc1mwyENgfKR2FDbzJnofXPWmptO6MpRtojpr3V5BafKq70XuadZX8lxpouFIEqNxg4xXORymXbvGMHA96kuFljJMbsq4z8pwDWyrO5j9XTOw1CCO7sopAyhsDeq8c1HBHFaYeMx7wvKntXPW2pyiEksSU42k8Hiso3tw2R5rj6GtJ1VFGEMLOV0zsn1HzFKFBjcBnPas2/ZC4kTnsTjv7VkW92HKpIDk8bs1qWJd32KQB/eIohUUkP2HspXKDpFcRklAM9+4rNkTHyjJweAK6XUbMQ5LKQXwQOn6Cqf2JV/eoARyeO1KUeZm0asbXMeEAAtz+NXftpSARxnaNp6HvUF7C0fyKh2jrzVYDmsneLsbJKSJoZ1jLBmbnvnFSfa4/7zf99f/WquoBzkE49Bml2r/db/AL5NO8g5TTvZQbZoc8gfKAOh9awkVpHxjrU0k7kjaQB6VGyEYK4C+tfN048qN6acULJCypu7+lLbyeWCT1A6GnwCQIxBVlGOM8mtay0x50V5l2x4B3EU5zUUKdRRWoyGFZII5lyZP4vSp7Gye6vmjKkIjbnPpV8KsIWJmj2A8YXnjvxUlpdC1eV4mVPlHJ/jHPBrlc+ZWRxyk3qin4iAWzeC3JLP99s5wi9B+JArn7I7UDqfmU5qzPdO5lIziTg8dO/HpVeMYBAGK3grRR1xhaFjQWdhtVW+9nP41LJmF8sS25eRnvVCHAbpg/0qcsWX5jntzWiRnYkllV4sEsDwOvf1q1ZSoVZIsghsgkcGs5x0GaWNCgUo2Mn1pcuouXQ6MXQEUjR5VsZI/nVC933IgVCWygzjviordJRteNiz57da7rwlodnYWo1HViBIpLLGR0P071pCim7l1MQ+TlDwb4VW3hj1XVlEcK/Miv2A7mrnivxa7RtYaSBFDjDSDqfYegqj4l1+41L9wqFLZOiA43e5rA86JADKVfBzjtXYlY5qcHIZbWk1xnzH2LnJOever3mraxCOAnp1HFVmvlkYOAAWP/fNZWq6iGDRBycHgjtWita53QoxReuNU2PjcCMZIzx0qvpXiuayv1YIZ7c8PF0z9PeucmeQrhSeTzTI0IXc3BzWU5OTNZQUlY7XVhbXqi6s8FB86+qA9Qf0rKtZLdLhZpmwRw23g/U1jW8skJYQu8e4c4ao2mdmYk/eoWmoqVHl3O1tfEcZLQKRHApwNw61k6pM10S6MgRmwoBrnk+aTHNakMK+SolQgK25s9x7Vqpc6NWje0qf+zGSWVwSgyADmq9lrk8XiE3Dt5dtcnaykdT2qvBGszIwkPXaN5FQ6pNCwNmwDyI2VCgYFU/dFyX0OivpjvkkmZcKAVjB9q5O7a4vpXklYjk7TUlyzpYiQnbKGAVOOn0rY8MaLJfXC3VxGFiQ5bsGrknN1pWMI0FSlzMo2Hhu6ntluW2Ii8lmFVdbcNcKoHCIFB+lelXjxmxkSKOOMBfl6cjpkV5j4gkX7WEQYIBzVYikopWNIynKp7xWtl23AYDqeKWSHdIzE4wTgVBA7b156Grpx1JrmSOu5RZCpOa6vwDotvq92rXSkxg8rnGcVzEhJY5Fanh3XZdJmjfbvEZICjjIINaU2k9TDE87p2gb/jLRtO0u1u3h+bJxFnqo71wGW+8p6dvWtbxDrV9rF0z3MhEY+5EOiisYkq3PfpRVeugsNGagufcuAh0GD2p0EmGIIxWcsrRkkHIJ4qd3LASIc9jSSOqxZlk+cYPDE5qK33ecyqxxtpjP9046Va0xGZwQo5amo6kSdkQ3Uey4de/pQ0jGFUG0Acg45qzqzxyXpMYxgbSe1VGRgQhHUc4rR7kRfMrk8YjYiM7wSOoNTNJK9hIrMSI3wBnI61TjaRXDCPO0YXA6VNDLIBIrR538kmspQbYOxq+GZIfOnWVY1Dp3HFFlI7wgLIMRgp1rPMLHa+wZxwB0NV3jkZX2kqQegPQVNWk7XDRnpXgGTbpLtvDN5hJwPen6nqtxaXDqwxFjjK55rnvBV4baOSOZyi4DL6c96drl808piMpcDsRjFehTl+6SOFUV7RmNrcav4jkkBCqwV+ncjNRYzLtY7v061BdI00rOWXBJCheN3araNE8DEHbIAoC965ZTs7HY4tJWGBSJMEYA4+ldnoD2/wDYrKGxtJ+Udea5W+XYAdxJZdxye5p+iTmImPLAb9x+mK6IJJ2Oed3Zj7/SStxNLtbYeQo61nRAef5cYLAgnB7V3F95c9t5ysHBQg5PfjH9a5aWNba4R2xHg/n7VjVpJO5205uKsVrdFBLNK24DpjoKma4O3CNk+jHOaW++ziYvbOAkgyeOR7VVwNwYHpSp7aEVtdyQ/wCtTIABHIpjIdxYHBwKleRCBxhlGDUbMDyDV3Mbkvhq4S21hfMZkV5NkhJ42n2ro9YsJLKYuTuQrlSF7H8ea4qcskpcDoQf/r16ZYajb+IvDaRI6C6QFdpPzZAGDXZg8S6b5XsbUZuDuZnh/VHjdke4Cw7iOegHr+VaGq6YHjS4sHDIzZyBj865u+sL21uNkyMxQA8nrWr4c1p7d3gMchiYbXQsOfbrxXrS1d4noRmpanL63czw3gjCeWYxtcIOW9zWOLl5VZWJ2Z4z1q/4reV7t5Fdue+f0rDdiOhrFV3GpyyNoT5JFtpAEILNjnIFPW9EQHlkMT1zWaXY9TSA1UsTyuyNXVa2R0ZukezUlhyePb6VSkVCdygEYzx/n3qnAzFNpPA6VIs5jbAbHrW91JXYct1dlhlIXp15qKQuFYKuBjg+tWsxuA4Y7R1qQCJwQCBtHXsT6U5UuaLRM6bcTMZGCZ4U9eaamVGD0/rVl4ZWl3HAXAxk1DNsBCx8/wB72NeNOjKOtjy6tCyFijkkb92pOOvtVgRuzbdwyP4g3A4qqQwxgnGOacGeMfLtboc9Ac1EWedOnysurHIMSbflXnI6U2SYiDB5+f8ArUK3J2hSUIHQEfdoM0jKy4XB/lVXMmKAxPyg88gjvULom35A2QamS4dWymM7cZxyKC245IHvgUPXcEQEDGVra0a5wM7STnnmseU5kOxGXAGQWzn3q1o80STBJAoJ5GBVQdmZ1YOcTsLu4hmiVHIDKv3j3qiYgYRhwD0IxTvNgkiRJPmwMdc44qsWkjnBiAC8ZJPpXYeeo20RFPbtIhUrkg8n1rHuLKSNc5P3sCu2gW2eJWkdfM6kGs64ktA7grlt3NTJXNKdWSdjm4YokTMu7J6Gn7bX/arQaHzHLxkHPU4pPs8vt+VTZHUqxza4DZIyPSnOQz4XABwAKWOPI+bgnoKFMcco8wbgRwR6183ex1t2Oh0LRi8SzygbDyMd62NRl+zWhYD7o4UY/wA4rn4NWuUAUsVVcHYBnIqrqOozXdxLI20DJAHUCuKVKcp3exwzoynO7Lc12xMbkjruIAx36c1QmuJJCR0TtUKbSNx2hiORilJJPNdChFHTGmkCcKwOOTwaUCgfrSitYo02Q9OGz7VIM+vFRAnNSRsQw+taJWMxzccEGpIk3crkZOMZFMPzN8zHGOParmkLBHP5l0AypyFB6n0rWmr7kSeh1Xhm2t7O2OpXiB36Qx4+9jv9KZresmSSSaYuZScqifdXnpj0rEvtZnkkcKAisNvqQPTFZc1xK7bi+T3rpjEI0JSs3sWLrUZ5eGJAGeBx3qulwc/MDURJfn0+9/SkwKTZ0RtB2LElwQoWMkgHP0NU5XDOSCfenMSKiI25Y/d71nJ30NFLsInyjcTwaa7EkgdKaAd2SpHHrTtrEZGPxpJXN4xuhVzjNL5b9QMjPUVJGhGHK8HsTU4iCpGHywD9O3/1666dC+5tTpNi6fHHGDLLGGIPANXpLuMoEJRgoO3J5qC88t0OxyGI7jGRWa5/dhiFzntSqWpaETg4uxPNfkqFiUKQT2qCNZpZlbdhiep61HCoaTmtqyRRgKoJxznsPWue7qELTVEug2McmtJbakWPmj5COcntiu1l/wBERYkYRRD5F3cZrktTz9kinj4eAh0x7V0WjXa3USTPIrGRRlT/AA4rWjDllqTJc0rskScm1JMJlbkDHeuC10Ml20mOSeQe1dl4gv4rRGdWz1AwK4G6ufOJBOeSazxMlfQFHW4xZHWUAqOtXopAuSwJPXB71nFiZVJ61diCsH3YwP51yo2auWBPFLhPKiHOTjPFR6u0MEoeEII34HoMVXeN9yyAcHI49v8A9dbMOjNqdvEpzGkQAwV6+9aKLexk1ZnMyysxAQ8+vtVyx02aZTJdOUjAzjHLV0N74etbOxEkQErq3LdDUWTJbBGXDOR+IFLka3FOpZFibTNMvdCWGKMQTwrnfjqT2rjZYJLWRonBV1OGBr0Cz2W9t1ALnAyeK5LxPCU1AeVgl0y3ua2nFJXMaEpO9zPtkMjqDnB6VpmRLaEBcmQKceg96paepj5cdAce1T2zhnLbHc9xjpURN56uw2OJyhcuj56gmg5TplAex71ZkkY8CHHrmqtyjFd4UKBxwaezC5IpXG15DjuF6mpPMAB2oAMcAmqKyuFAHBHenQv+8ywJ9KrnQG5YrGUyxEnHIHFVJ4/LmdQpCuM8c4qeyCsPkVpT6Lwo/GoL3cLlwyMMLnnmpdS+yJ3dh2mtIu5GO0g4GfSl1NZghYycg4Jp2mxx3FwAwxwOak1VvMG3btKtwPWsqdS94jtrcoQhzlWdcdD2qYhQvHBHpUDROshdlwGqRCfugj2rSOg276G1cJE+i2rt/rTxknqMVmW7MJPkPJ+X86kVi1gqEnKN+lRW2BIPbkVpKWphBWizUsLplRo3+YYwOehqtq0olEYYrvyOvXHvVcMRIMHqcVYSHDFj39KiT5tzeMnZGapO9j2JpWbGRyNp5rWWxD4wOSM80txpts/mP57qG5A285P40krLQU5XepjtKuOKQSx4ywYH2NaiaLFINqzSMQP4U/8Ar1BLoqoufPkVj0BX/wCvTJfKZsjpsyJCc9SRV7w7a3fnfabOcJ5bDJGefbFMbTIyu37Q27GT8vH86v6TImnW7KZMZbOdtNRktQRvarcX7WrySCGYDksQVP8AOuWj1OJbgvtdCxG7nNXrrV1njlt5JCDN9xwOAc1hta3ltPvMDOqN1A4PetFWqR0ub0247FrU2YwhCEBA4YjrWJIgQ98j+VdVFOslrGZISBJnjbkg8VjapbLubYGUr2I6mu+cfaJSid172kZLKBgluvbFIak5Usm8nGfbrSSMCCSPmPT0AqIyVrMvnQ6KUquDTHJZsmkCtwx6HpQelautJrlRbndWJoJXVWTnkVYjuisYUcgHOPeqsaginEYzXVCc4x3NIza0NaK4SWN0BzuGCMckZ7VnzKPMbGAB0qJJdvA71GWO7rTqVIuIpNPclyWAG0ge1CndxgseTxURJJycDt1609GwwbuK4lSUmc7oRm7DyuOuBntUnmBABjHJzUZYbMbckn06VEzNWNam4PQ8/EYVRehMWYv8h5bFSl+SSO2cVW3HHXFO3nGKw5jj9k0SlgenFRtkOHXg+1ANGad9SbFq2v5YuCNw96vf2izRgKVDOOnpWPgU08dOK1VaRDpRbubsV8qqWyxwOtVJNReS4VgoIz0NZ6OApB705Fy4+vNWqrkR7GKZ0sEqMgInRD3GQKk8wf8AP3H/AN9CsKGfyl6KSevFSfbD/dWq5mZ+wMoMQeKHdiu3OR05H40lAFeCdY4M5XG4gjgEelPjHyhcniminrxQApzn/ClXNOxxSgUWFcTOKcBg59aMetKeuKuMWyWx1OGMZyM+lNFPVQM8da062IY445BGT2p0bMPcnj7tNpRjjnmk5OJDEy3POfT2poPNObFIOvtW6rXVjSNVpWBySox1H4ZpcEAHjn3pWAz8oOPc0xvaouHMDcCo2I25J49KQuOhaqsjlmILcUzenBtj3bIGOMDFCFyD7dvWoQSTyafHMUYNwSD3rSm7PU7qcbF+GQLHsY5B5NNafrggEenAqkZGycDJJ5z2pjhs53Eg9q65V7LQ3dSyLUtwTxniq+Hc4BJ+lPtoJJHyQdvtWla2ignaOOp9q5HzVWc7u3dkFjASPunPrWtbK0TYZT6ZA6UixogyG46YHGaUfKu4htpIDZORit4QUVqJotFwysm9chemPxxS6VcfYfOt5W8t1G+Js8EHqKgIKTKInDZ6ewrI1y4aa4RccoDlgeDSqS5NUTYk13UWuZDB95QdwJrLRcDgflUtrHuf5lzzz6VbMKeWcIAexrid5u7C9inDuMgwvT1FPZ/KEqYxuGcGrlpbMdzlSVAznNQSwmUkqpBxg0clh3NbQiJLcmTa3TnAJFdFFdJFAY0cYx8pxWLpUaQaerEDLDp6VbVwo6Z7rz0rshsBJL+/idiWww4GT17mqs8LLDGcg4B4AyefShX+Ynbzk8H+lS3V8lnbSzy7SeiKOmadS0lqRVjzqxh6pfyWgEIRjIVGN3b8KyklZpvMkJY/WoZHlvLoyMS0jnNWBaygDOeO3rXG5OTCKUVYmDDa8vYcEfjV6yXzUxH85I6A81QuEKxqiqSOpNJbKVwY3ZG9qfvLYTLt6LiOQ78IvTHX9azZnzyAW5655q3MbhvvSbmA6GlsLVppd0nyKOSRStKWjFck03TWuI/NcEIeRUd/AIpPl+6AAPetUyxRQPGkm0AZA7msm7kMzFmYlRxuA6VtZQjZDLuhyfu8MWVd2Mg1Le+WJGZnLFuADWfYnbgorYB71Z1EGWMBuG7nFJInqUFupbWf9y+VDZx2rore0e9USOFDEZ65rAGnS7DKoyorrdOiENjG5GPl5NTGkk7miMK9glV8EdO1Z11FOMSBTt6eldTcCORzjOO2etRyJEYUicb8Z47Cq5RKNtWYdk+9JAfvYqWNeC3oKvRWaxSAg5GDn6USwogwuf8AGpMlpco3+FIx3AJ+tTadOHX5iSwPOajukDgsSMmqtsrxTnrz0oLjsdKjgwHyzhhzWJe306Z2qAM56Vp2joIwTxuOMZ60+SKGVnVu5645A9Kdimrk3hK/Kyu8xAQqAML3qh4r1TOpA2zKAAc/Lx+VWEAtk2KPlHI96zLm3tZWO7cztyTngULQjkXNdlD7fOfSg3LSKRJuH0qzc2dmkW5HfIH61RGduCKTnI1tFig25/1nmH0xiuh07XrSC1EB3sMYO4nNc2VpFTDD5frQn3C1jpZr3Trl8xy4IGAO1Q6rGk0fm5AyRwp+bPp9M1z8kRCtKh27W5xWppVwZrbY+HIyOuCK7sPWd7PY6KVRtpPYyrqAKWKINp6MeoNUWBB54HYk4zXTXsaSRtF5bNJxhhx+dZl1aDGHBUrycjP4VvUpc+x0szQegxkDp70mNoHI9OtPcYHAqLkNkdfWud3hoIeGwOD9MGguxHJyabznHfOOaXIx+lHtpMbm0OhOHyfTFIx+bI6UgxjB/GitVV0sylO4pznOKcnLBe5qMjvTgSGBGPxrSMuXUd0mXRAwIUliMdF7GlkhIGVXA/U0lrL8/wAzADPT3q794HuM10JRqrzCdpmckXyEORjOcdP1qNkblgp2jjI5FaU9vG2CrnAGSSMVBK4jYqdrRjgA964auH5TkqUUkVAaA3NLKRuwFA+hpgzmuN+6zjcVYfml60zNKKOYxtbQUjmnhsU0UfSqU7bEsUu3Sje3+TTaKfOwsNpR1pKAK80B4HWpFqNUDDJbGOlSJnbjvSYh4PanDimL2qTitqaT0JdhQKXHuR+NIWJAULjnrmnYOBXbRpxW4KwqjnJ5PrThTMZc8kDFOHHAp1PZp6CfKh3el3H1pKDwM1yVLN6GT1YEZ5pBwaQuuOtRvMqgnrSSsNQbZMWxVeSUnKg8d6haVjkdqiY9cVR1U6VtWSMQv41EfvGkY03Oec00dUdNhWPFICDxnn0pGIHWlTAPNWos0Q4HBPAp/OMgZwM4pqqT0q7YW5MpKruG35g3Y4raCvoXa5PZwsUDkL+fStG3h/ecN9R6022iymxwVK8gn/PSnIwAKM43AZPpW9uXVD2Ipp0w29SgU46VWNxKd0ZBWEH7pPSnTvE10FLkc5NUGkDTFueTXPVmZTfYty3so2lCVwO3YVQVhI5DEg89e9SSSAtgLSFATmsG7kXJbYqmdx7VOZ1O1R82D0qoealtVIk3Adev0oSEy2ZnKKgwAOOKijlQZO7JBpsvyvvzVaIbwxY8+1OwkbEF7GxOC2B2xxmp7WYzSs+fl6e1Y1rbuWI3sqE8/wBK6DTrMwQlTlJCNwz6VtEqw8DLVn+IbOe5t4TFgjJ3e1aE0mNigbtxwfammVFRkL7Ap475NU1fQZg2lsbDbPOuCOx9K07ZFusSLGUU1JNAtwQX+bjOPap7kxW9uFiK4C8DvUqny7EsbLawRAhSCxB4znmqTRDy22jcM59KozXshl+8Rg1K11lBhif5VFzOUbjioC7mUE454qETmItgEBevoaSS5LDFQMd6nccmoYKDJfMMkhHT69qURF08kEHjkj1qvbsYw5PXtVi2lw7Ejpg59aEtS7GxpVmY4FUgEk557VYu7YRrncGLHJxVCz1IBnyc5HA9/WlivzPKSxxg4rTQbSLiIiRqFBKk/MRxV1ZlYcfKpHcVVg2sckjGMfT3qrFNKT5bcrnncfSqsCG3t7sumQvuckZOP0qo9xJ55Zsr2GKZqUeL3zQwbd+lQuTJ64B4NZtibNAXZBwTnApDd/IFOTjpk1QUkdac/KECoM7Eom3Etjj0pd6eh5/Sq44p8bLuBPQ8UFE0FziXygxJBGK10kLSoQN5xyPSsiO1WOUSox3Y6GrtrOoADHY+cZPetYDL7BGjwzFSG4yOlV5o0b5dhXuWFMM+ZPlOQD82ak3qyMwIIPSqaHYz7jCMVDuR3wetVJVUKcAEnuRVu6BznFVnFYNagiowPBUZqYLwKcUyQc4x6d6UDGBQkUPgjDAqwyDxRb2ckE3IAHpmprIZOSRj071eP3cMRkDGRyDxxXVCn1Lp6MiG/H3iBxxUdzErnKr9MHGPw+lSNk9eaRQfbHpXSm0dfMYt9CsZZTjjoMc1WZT5QUAEPzjPNbV3BuO9WUjHK1nSQqj9Pu8cd6uCTldjWpnSgbjnpTByc1bmAA2kDOD+vrVcEBsEDioqUuaV0VKOow8UpOO4pSAScDFGM4G0nnHSuaUeVmb0DHzc88UDoDSA/Pyeg5PqaDxyP8+tNTaBMepOcDrVq2mYsCxOAMke5qsqDhs5B6Y6U9WKknAJPf1rpoSvsaQaZqZyM9s1FPBHLlgCGXHGc8VXW42YJzj0qdZzjpyTjFdc9dxyjcguYlSMEnDLjA9RVZ1ZDyMDtWhsjkYbwAx6c1Bf4CKu7uRXn1qHVHHOhYq5zzThUYyOtOPSuSxyTjYfSA0yjmkZuJJRTRnFHPrRcVmKBmpEAGDTV7MelOFcBFx4weoFKAM00Nj+tOU80XE0OYAAEc+vtSim9acK0iSxwA/GnZ4po/rinEZJrrp1NNQQBgenWnA1GBg5pRwRWVRpvQmWrHM4Xqaqz3BB+Wi6bPHcmq7OBUpG1GmnqO81iOTikLnvUROTQadjqUESb+M0gYnrTB0pd2KpIpRFJoTpSdaeq8E/nVJGiQEKMEgnFKV55xS9OtTwQ7z8/Cjn610KLexokEMDfI/GCeOa2ICIvlXlQuWI9ahiSMOpUgANhfTJp7gRxuQerEEHg9eDXTGHKtS0Sy3OcAjAOOe9Ubm8MZfaMZ6H2qOa4OxsknGe1Zsrs55OR7jmuatVtojKo7EguJJJSxYmnLxioYvlJ709nAPr71ySk3uZbkzdQaUNxURb5c08Kdgb1poQ/NTxPhFAwKgTmpBwMHpVIQSkuxBPFWrMRKp3rhscVDFtzwAfrVhsOVAA+tawQ0i5p4R8sQMjtitNSRllk3YXoT1yKp2iqkRBxluM1LuzgYUHp16mtSiCSZghyAPQZ5rOluN0pfZg5A/CptQkwCQTyORjpiqMR+bd39Kzm7CZejvVRtuxjkYyD0FV7jUZGDRxjaM/jUMjgPuThs1Xc/MTWfPImwjHccmgccds0iHJp/aoQgLg4x2pQaYcCkZsCi4yTvn0pfOwDkCq5kbIweO9NL+tMCRXOSRxmnxy+WMZpkfOeOlMblqlhY1LS8flWOT2qzLcRo2Rk7wD16ViI2DyKsz5a1+XjFaKegWHNOdzEAsueDSxuCAOR7VSLt6/WnQyMD9ah7gy9S1FC52nPNTdqCBPWmhwrgnqSADSt1HvxUOOO1UM1ILgkbe4zyKR1YjdjJB3DNUIZhEcj8SautcAgDGcDoapDJ1uFCfMgBbqamid3TYV5BHK81WhVnRXZdv1rRi+UcYx2IrRDsVZ1+YkqQfeqEud2fWtaUZlHyE5H+TVCaMq7KfTIqXFC2ZUz2oYgDmlZSOoIz2IqJvvYY8+vSs2hXJopyp+X16VaW4ZzjbsyfQYrNyysCq5x3qQT9VZVAJ4Hp71tTnbRmlN6miJQZNo6Zx+NSDrVSKViGIaMsOnbcamUuQxUHrz7V1XTOoSZ1ZSoUtjoNvWs+5Qhz8rMF7CtBgQTgMCw6jtVK4PyNvZs9GHp+VbUdzWluZ0g3H5utN2qeCBUjDGW7E9KZnmuySR2NIhcYbFM7jJ4z3p0hy1MPTt07mvMxEbO5yVlqKMBjg5+tB9j/8ArpuCOD2HXNO48zd2IGf61zJmAqAZLdfWnFsHB61Hjjlht+vekB2v1Y96dOo4sqEuV3JgdwFTIx2gY4/lVeN1GfXPrUoYV6UJKZ1KzLMR2gFQCB0zyR/npRcneoGeneoU5PcYwfSplIdMgA4PTnFU4prQJxuipPkynjiowauSxkpnd/D+B/GqgXHcfSvLq03Fnm1ocoGig0VgzmsGaM0ZozSsTYlXtTh2pmQOtOzuYE9ulcZiPUA9RThigdKKTAO9PFNA70uaqF7kMeKXPXmmg0GtbMkXPamSPtXjmg8Y9Dwar3EijIPLdPpRYuMOYjeQnkjnFQkknmlByaDVXO6nDlQZGaGPpTQOaXFEdWaJCgml74oRSSc8DsfWposBskr+NbKJVhIwobLKSuOMetSAjsuM9eaGkUg5Y49BSZB6Z/GtYxSLSHABJFJ9cge1W0+deSAAc561Xhj5bIAx0JNLLPsTbjBJzwa2vy6j2LIcR4IIBJzjFMe5DIzsDnoB3AqhJMxxg1GXY9SaxnXJch80hZjk8VHTcUZrlbu7mUncdu96VcbgO1R1YjUAkdaSJJFAPbipQPlA7UijgVIOlWkIaFx0OaegJYU5E3LnOKmto8nc3TsauKFYcqYUcVas0TgOvX9ahJBJAPSpFYxgKeSwwp9K1TsMtOY1YKDjHABPT8ajuXyVyy4Azwe9Zd1M0Cll9ccmqT3MskpDS7ifWplVKNK5ZSDg5FUJZcnAqASupwTkCkLZOaylO7JepKrH1p2eOajWlJpBYfGcGng5qNBk0OwTvyelAxZQCwyaikJzjPFMkLbhzQDxQAuQARTCec+lFIKTYWJkkIIY8+1CMehH41EDinKaGFiYYqZHfYUBGGFVlNWI+AtCE0VNzAlTk4Gc1JG3Q0y/BSfAPGM+3NNib5PcVL3Cxox8g4Xr2zVgZ71mw3BH1FW4bjf1PHaqTE0Tum5eDgjvVZqe8nPHSmE5qgGn3p6SFc9zTD0puaEwNGCd5FC79xAPB4rTtZFC7M9OlYEUhUnPINWY3yuVJHNaKYG/lCMY59fWqk8bGUgYK4zwKdZSpKm3ow9e9PuVbZleP7xq0U9jPuwNwIzz61TmUlCQMmr0wYrlypI6ADpVWYcj1qGiCvypA+uaQNk9MU9xyTUDnB4NRsWmTK21g3pU0czRqcNkkjv0FU1z1Jp5bA+nNa06ttzSL1NS3lRw2AQvoTUFxtZmU5II4zxg1XE4LqUXYyjkYqWGYSjKnB75HWu2lK7udFN6lOZU3AliSVGOM9qhIGeKs3O4qWAGM+g4qDjHFepC00enTSnEqyAhqjbofpVmSMMcmoJEINcVejqc1Wm72Gk5puQw5BA9qXFKOFx715s4WZzShYR+E/DAFNY5bjkfWlJxkEZFNJxWZFhB1qVHxwaiB5pc1aqNDTZaVwe/WpomI43ZNU4zzU4ODXpUpaXOym7otD5l3ZwvYZ6VVeI+aewp8TsXOcHJyc/rT5OV3ZPQ4+lKtZq7MKsblaRSOd6EZxgdaCRSPwxFNryp6vQ8+UXcfkUZHrTaKy1IsSnHpTlxxjNMpwrlRzE/bPb9aBSD7lOXoK0UURJ2FoxQKGq0rErUDgsCOgpDIgOM8n0pF+41V/46ZVkh7lgO9VmXn1q3P0H0qsep+lI3oK5GRzR2pWoPSh7HWNzilAJIwfemn71SR/erSmupaHFmztUdaA3yc44PWgf65aZ/ywb/AHh/WtblEvfjigswPGMUCkatI6sLlhpAIsAHd6k1Uds5B61OarSffNYVpvmIk7iClJpKKwuSLQvWkpRTWpPUegywwKsxp3qCH71W0+6KtCYq5Vi2M9vpUkY3HFM/hqS3+9WtgGsCW29AM1ajP7sLiq7f6w1Yg+8v1qkJMkQHYBsIPelAGN8o+VT61NUNz/x7N/vf0pjM3UikmSG47VQThuasXH3fxquPvVzy+IY4oCOOtSKMKAQAQc8ikT7wp8vUUhDd205xn09qRScHd1oNA6U0IekhHYfhUU7byCe3SlFMehspIbnmnZFNoHWpuGwtNp3rTKQ9wpymm0q07jJQasxNkYqrU8PamSx9+itbo4zkcGqIBxWjcf8AHl/wOs8fdpMQDipkcgAccVDTh95/oKSYywJueSKlWRT61R7irKdaq4WJiQRTHNOH3ajfrTYiSMjue1WIJVBAY9O1VF6U5P8AWVURGlkLh1Y4zVqC73KyswKnA5NUf+WZpsf3PxreIjTKJK5G0qyDNVbofMAcE+tXV/10/wDuH+Yqlc/6z8KGBXYH9KrSjaatmqtxWbAjB9KcOaYtPHUUktRpituxlcZp8UuD8w4PQelMHSkHUfUV0U3qdNElZ9zsGGRj+VROAjurowwOBnoakH33/wB1qbf/APH3J+H8hXfh5vmsdmHm72IRzRIAB83HGaI+p+tJe9D/ALhrvnrE7pK6KzAZ46Un0pe1NXrXlTV2cEo6jGHJppFSN1NMauapoZyVhgzS0GiuczBDg1JFIQTmoqcvStacmnuVTbRZjmAYE4qRHJfJ4HqKqGrK/dH0r0U+danVHVBIPMcu5yxpAqg8YJPanHrTV/1hrL2aV2c04IY/DEcUlOk++abXM4o5uVH/2Q==';
        }

        getGroundY() {
            return Math.max(150, this.ctx.canvas.height - this.groundOffset);
        }

        triggerShieldEffect() {
            this.shieldEffect.active = true;
            this.shieldEffect.timer = performance.now();
        }

        renderScene(sceneBackground, characters, particles = []) {
            this.renderSceneBack(sceneBackground);
            for (const char of characters) {
                if (char && char.visible) {
                    this.renderCharacter(char.skeleton || char);
                }
            }
            this.renderSceneFront(sceneBackground);
            this.renderParticles(particles);

            // Protection shield overlay if triggered
            if (this.shieldEffect.active) {
                const elapsed = (performance.now() - this.shieldEffect.timer) / 1000;
                if (elapsed < 2.5) {
                    this.renderShieldOverlay(characters[3] ? characters[3].skeleton : null, elapsed);
                } else {
                    this.shieldEffect.active = false;
                }
            }
        }

        renderShieldOverlay(skeleton, elapsed) {
            const ctx = this.ctx;
            const targetX = skeleton ? skeleton.root.worldX : ctx.canvas.width / 2;
            const targetY = this.getGroundY() - 105;

            ctx.save();
            const pulse = 1 + Math.sin(elapsed * 10) * 0.08;

            // Glowing Hexagonal Insurance Shield Barrier
            const sr = 65 * pulse;
            ctx.shadowColor = 'rgba(56, 189, 248, 0.9)';
            ctx.shadowBlur = 20;

            ctx.fillStyle = 'rgba(14, 165, 233, 0.25)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 5;

            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI / 3) - Math.PI / 2;
                const x = targetX + Math.cos(angle) * sr;
                const y = targetY + Math.sin(angle) * sr;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Inner golden shield emblem
            ctx.shadowColor = 'rgba(250, 204, 21, 0.9)';
            ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
            ctx.font = '36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🛡️', targetX, targetY + 12);

            // Floating Protection Tag
            ctx.font = 'bold 18px sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('✨ Protection Active · Risk Absorbed!', targetX, targetY - sr - 15);

            ctx.restore();
        }

        getBikeSpec(skeleton) {
            const rx = skeleton.root.worldX;
            const groundY = skeleton.root.worldY || this.getGroundY();
            const t = skeleton.animController ? skeleton.animController.time : 0;
            const pedal = t * 6 + (skeleton.bikePhase || 0);
            const crankX = rx - 2;
            const crankY = groundY - 25;
            const bikeColors = {
                dad: '#0f766e',
                player: '#ef4444',
                friend: '#0284c7',
                mom: '#db2777'
            };
            return {
                rx,
                groundY,
                pedal,
                wheelR: 23,
                rearWheelX: rx - 34,
                frontWheelX: rx + 36,
                wheelY: groundY - 23,
                crankX,
                crankY,
                crankR: 11,
                farPedX: crankX + 11 * Math.cos(pedal + Math.PI),
                farPedY: crankY + 11 * Math.sin(pedal + Math.PI),
                nearPedX: crankX + 11 * Math.cos(pedal),
                nearPedY: crankY + 11 * Math.sin(pedal),
                frameColor: bikeColors[skeleton.role] || '#ef4444'
            };
        }

        renderBikeCrankAndPedal(crankX, crankY, pedX, pedY, isBack) {
            const ctx = this.ctx;
            ctx.save();
            ctx.lineCap = 'round';
            ctx.strokeStyle = isBack ? '#475569' : '#64748b';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(crankX, crankY);
            ctx.lineTo(pedX, pedY);
            ctx.stroke();

            ctx.fillStyle = isBack ? '#334155' : '#0f172a';
            ctx.fillRect(pedX - 7, pedY - 2.5, 14, 5);
            ctx.restore();
        }

        renderBicycleMiddle(skeleton) {
            const ctx = this.ctx;
            const b = this.getBikeSpec(skeleton);
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Trailing motion streaks
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.lineWidth = 2.5;
            const streakShift = ((b.pedal * 18) % 30);
            ctx.beginPath();
            ctx.moveTo(b.rx - 72 - streakShift * 0.4, b.groundY - 12);
            ctx.lineTo(b.rx - 98 - streakShift * 0.4, b.groundY - 12);
            ctx.moveTo(b.rx - 66 - streakShift * 0.6, b.groundY - 30);
            ctx.lineTo(b.rx - 90 - streakShift * 0.6, b.groundY - 30);
            ctx.stroke();

            // Rear & Front Wheels
            [b.rearWheelX, b.frontWheelX].forEach((wx) => {
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(wx, b.wheelY, b.wheelR, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.arc(wx, b.wheelY, b.wheelR - 3, 0, Math.PI * 2);
                ctx.stroke();

                // Spinning spokes synced to pedal speed
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.85)';
                ctx.lineWidth = 1.5;
                for (let s = 0; s < 4; s++) {
                    const a = b.pedal * 1.4 + (s * Math.PI / 4);
                    ctx.beginPath();
                    ctx.moveTo(wx - Math.cos(a) * (b.wheelR - 3), b.wheelY - Math.sin(a) * (b.wheelR - 3));
                    ctx.lineTo(wx + Math.cos(a) * (b.wheelR - 3), b.wheelY + Math.sin(a) * (b.wheelR - 3));
                    ctx.stroke();
                }

                ctx.fillStyle = '#334155';
                ctx.beginPath();
                ctx.arc(wx, b.wheelY, 4, 0, Math.PI * 2);
                ctx.fill();
            });

            // Diamond Frame Geometry matching IK seat & handlebar coordinates
            const seatX = b.rx - 14;
            const seatY = b.groundY - 62;
            const headTopX = b.rx + 21;
            const headTopY = b.groundY - 60;

            ctx.strokeStyle = b.frameColor;
            ctx.lineWidth = 4.5;
            ctx.beginPath();
            // Rear triangle
            ctx.moveTo(b.rearWheelX, b.wheelY);
            ctx.lineTo(seatX, seatY);
            ctx.lineTo(b.crankX, b.crankY);
            ctx.lineTo(b.rearWheelX, b.wheelY);
            // Main diamond front triangle
            ctx.moveTo(seatX, seatY);
            ctx.lineTo(headTopX, headTopY);
            ctx.lineTo(b.crankX, b.crankY);
            // Front fork down to front axle
            ctx.moveTo(headTopX, headTopY);
            ctx.lineTo(b.frontWheelX, b.wheelY);
            ctx.stroke();

            // Chrome seatpost + saddle
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(seatX, seatY);
            ctx.lineTo(b.rx - 15, b.groundY - 70);
            ctx.stroke();

            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.roundRect(b.rx - 26, b.groundY - 74, 22, 6, 3);
            ctx.fill();

            // Chrome stem + swept handlebar grips matching hand targets (rx+20..24, groundY-81..-83)
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(headTopX, headTopY);
            ctx.lineTo(b.rx + 18, b.groundY - 78);
            ctx.lineTo(b.rx + 23, b.groundY - 82);
            ctx.stroke();

            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(b.rx + 23, b.groundY - 82, 4, 0, Math.PI * 2);
            ctx.fill();

            // Chainring cog
            ctx.fillStyle = '#94a3b8';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(b.crankX, b.crankY, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }

        renderCharacter(skeleton) {
            const clip = skeleton.animController ? skeleton.animController.currentClip : '';
            const isAccordion = clip === 'car_crash_accordion' || skeleton.expression.extraEffect === 'accordion_squash';

            if (isAccordion) {
                this.renderAccordionCrashEffect(skeleton);
                return;
            }

            const isWheelchair = clip === 'wheelchair_sad' || skeleton.expression.extraEffect === 'wheelchair';
            const isBiking = clip === 'friend_bike' || clip === 'bike_ride';

            if (isWheelchair) {
                this.renderWheelchairBack(skeleton);
            }

            // 1. Mom's long red hair & Bride's veil/hair falling behind shoulders
            if (skeleton.hasRedHair) {
                this.renderRedHairBack(skeleton);
            }
            if (skeleton.hasBridalVeil) {
                this.renderBrideVeilBack(skeleton);
            }
            if (skeleton.hasBridalHair) {
                this.renderBrideHairBack(skeleton);
            }

            // 2. Limbs and Spine Bones (layered around bicycle if biking)
            if (isBiking) {
                const b = this.getBikeSpec(skeleton);
                this.renderBikeCrankAndPedal(b.crankX, b.crankY, b.farPedX, b.farPedY, true);
                this.renderBoneList(skeleton, [
                    'leg_l_upper', 'leg_l_lower', 'foot_l',
                    'arm_l_upper', 'arm_l_lower', 'hand_l'
                ]);
                this.renderBicycleMiddle(skeleton);
                this.renderBoneList(skeleton, [
                    'pelvis', 'spine', 'neck',
                    'leg_r_upper', 'leg_r_lower', 'foot_r',
                    'arm_r_upper', 'arm_r_lower', 'hand_r'
                ]);
                this.renderBikeCrankAndPedal(b.crankX, b.crankY, b.nearPedX, b.nearPedY, false);
            } else {
                this.renderBones(skeleton);
            }

            // 2b. Bride's flowing pure white wedding dress over torso & skirt
            if (skeleton.hasWeddingDress) {
                this.renderWeddingDress(skeleton);
            }

            // 3. Wheelchair front cast & wheel rim
            if (isWheelchair) {
                this.renderWheelchairFront(skeleton);
            }

            // 4. Head & Expressions
            this.renderHead(skeleton);

            // 5. Costume / Accessory Overlays:
            // Dad: Top Hat + Handlebar Mustache + Bowtie + Walking Cane
            if (skeleton.hasTopHat) {
                this.renderTopHat(skeleton);
            }
            if (skeleton.hasMustache) {
                this.renderMustache(skeleton);
            }
            if (skeleton.hasBowtie) {
                this.renderBowtie(skeleton);
            }
            if (skeleton.hasWalkingCane && !isBiking) {
                this.renderWalkingCane(skeleton);
            }

            // Mom: Front bangs sweep
            if (skeleton.hasRedHair) {
                this.renderRedHairFront(skeleton);
            }

            // Bride: Chestnut bangs, shimmering bridal tiara & floral bouquet
            if (skeleton.hasBridalHair) {
                this.renderBrideFront(skeleton);
            }

            // Friend: Big Over-Ear DJ Headphones
            if (skeleton.hasHeadphones) {
                this.renderHeadphones(skeleton);
            }

            // Player Props:
            // Hand Prop (e.g. Glowing Golden Smartphone)
            if (skeleton.expression.handPropR === 'gold_phone') {
                this.renderGoldPhone(skeleton);
            }

            // Broke waterfall tears & moth
            if (clip === 'crying_broke' || skeleton.expression.tearDrop) {
                this.renderWaterfallTearsAndMoth(skeleton);
            }
        }

        renderBrideVeilBack(skeleton) {
            const ctx = this.ctx;
            const neck = skeleton.getBone('neck');
            if (!neck) return;
            const hx = neck.worldEndX;
            const hy = neck.worldEndY - 18;
            const t = skeleton.animController ? skeleton.animController.time : 0;
            const sway = Math.sin(t * 2.5) * 6;

            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(hx - 14, hy - 22);
            ctx.quadraticCurveTo(hx - 44 + sway, hy + 28, hx - 34 + sway * 1.4, hy + 92);
            ctx.quadraticCurveTo(hx + sway * 0.6, hy + 102, hx + 34 + sway * 1.4, hy + 92);
            ctx.quadraticCurveTo(hx + 44 + sway, hy + 28, hx + 14, hy - 22);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        renderBrideHairBack(skeleton) {
            const ctx = this.ctx;
            const neck = skeleton.getBone('neck');
            if (!neck) return;
            const hx = neck.worldEndX;
            const hy = neck.worldEndY - 18;
            const t = skeleton.animController ? skeleton.animController.time : 0;
            const wave = Math.sin(t * 3) * 3;

            ctx.save();
            ctx.fillStyle = '#5c2d16';
            ctx.strokeStyle = '#3b1a0a';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(hx - 21, hy - 12);
            ctx.bezierCurveTo(hx - 32, hy + 16, hx - 26 + wave, hy + 48, hx - 14 + wave, hy + 60);
            ctx.quadraticCurveTo(hx, hy + 64, hx + 14 - wave, hy + 60);
            ctx.bezierCurveTo(hx + 26 - wave, hy + 48, hx + 32, hy + 16, hx + 21, hy - 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        renderWeddingDress(skeleton) {
            const ctx = this.ctx;
            const spine = skeleton.getBone('spine');
            const pelvis = skeleton.getBone('pelvis');
            if (!spine || !pelvis) return;

            const shoulderX = spine.worldEndX;
            const shoulderY = spine.worldEndY + 4;
            const waistX = pelvis.worldEndX;
            const waistY = pelvis.worldEndY + 4;
            const hemY = pelvis.worldY + 56;
            const t = skeleton.animController ? skeleton.animController.time : 0;
            const sway = Math.sin(t * 3.2) * 3;

            ctx.save();
            // Pure white flowing bridal gown (bodice + flared A-line skirt)
            const dressGrad = ctx.createLinearGradient(waistX, shoulderY, waistX, hemY);
            dressGrad.addColorStop(0, '#ffffff');
            dressGrad.addColorStop(0.65, '#f8fafc');
            dressGrad.addColorStop(1, '#e2e8f0');

            ctx.fillStyle = dressGrad;
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.moveTo(shoulderX - 11, shoulderY);
            ctx.lineTo(shoulderX + 11, shoulderY);
            ctx.lineTo(waistX + 10, waistY);
            ctx.quadraticCurveTo(waistX + 26 + sway, (waistY + hemY) * 0.55, waistX + 34 + sway, hemY);
            // Soft scalloped lace hem
            ctx.quadraticCurveTo(waistX + 17 + sway, hemY + 6, waistX + sway, hemY + 2);
            ctx.quadraticCurveTo(waistX - 17 + sway, hemY + 6, waistX - 34 + sway, hemY);
            ctx.quadraticCurveTo(waistX - 26 + sway, (waistY + hemY) * 0.55, waistX - 10, waistY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Delicate gold/pearl waist sash ribbon
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(waistX - 10, waistY);
            ctx.lineTo(waistX + 10, waistY);
            ctx.stroke();

            // Subtle white vertical skirt folds
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(waistX - 4, waistY + 4);
            ctx.lineTo(waistX - 14 + sway, hemY - 3);
            ctx.moveTo(waistX + 4, waistY + 4);
            ctx.lineTo(waistX + 14 + sway, hemY - 3);
            ctx.stroke();
            ctx.restore();
        }

        renderBrideFront(skeleton) {
            const ctx = this.ctx;
            const neck = skeleton.getBone('neck');
            if (!neck) return;
            const hx = neck.worldEndX;
            const hy = neck.worldEndY - 18;

            ctx.save();
            // Graceful chestnut bangs
            ctx.fillStyle = '#5c2d16';
            ctx.beginPath();
            ctx.arc(hx, hy - 5, 22, Math.PI * 1.08, Math.PI * 1.92);
            ctx.quadraticCurveTo(hx + 6, hy - 15, hx - 20, hy - 7);
            ctx.closePath();
            ctx.fill();

            // Golden Bridal Tiara when wearing bridal veil
            if (skeleton.hasBridalVeil) {
                ctx.fillStyle = '#facc15';
                ctx.strokeStyle = '#a16207';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(hx - 13, hy - 22);
                ctx.lineTo(hx - 8, hy - 32);
                ctx.lineTo(hx - 3, hy - 25);
                ctx.lineTo(hx, hy - 35);
                ctx.lineTo(hx + 3, hy - 25);
                ctx.lineTo(hx + 8, hy - 32);
                ctx.lineTo(hx + 13, hy - 22);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(hx, hy - 27, 2.6, 0, Math.PI * 2);
                ctx.fill();
            }

            // Bridal Bouquet held near right hand
            if (skeleton.hasBouquet) {
                const handR = skeleton.getBone('hand_r') || skeleton.getBone('arm_r_lower');
                if (handR) {
                    const bx = handR.worldEndX;
                    const by = handR.worldEndY;
                    ctx.font = '22px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('💐', bx, by - 4);
                }
            }
            ctx.restore();
        }

        renderRedHairBack(skeleton) {
            const ctx = this.ctx;
            const neck = skeleton.getBone('neck');
            if (!neck) return;
            const hx = neck.worldEndX;
            const hy = neck.worldEndY - 18;
            const t = skeleton.animController ? skeleton.animController.time : 0;
            const wave = Math.sin(t * 3) * 4;

            ctx.save();
            ctx.fillStyle = '#dc2626'; // vibrant crimson red hair
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 3;

            // Long flowing hair mass behind head and shoulders
            ctx.beginPath();
            ctx.moveTo(hx - 22, hy - 10);
            ctx.bezierCurveTo(hx - 36, hy + 20, hx - 30 + wave, hy + 60, hx - 16 + wave, hy + 75);
            ctx.quadraticCurveTo(hx - 5 + wave, hy + 80, hx, hy + 70);
            ctx.quadraticCurveTo(hx + 5 - wave, hy + 80, hx + 16 - wave, hy + 75);
            ctx.bezierCurveTo(hx + 30 - wave, hy + 60, hx + 36, hy + 20, hx + 22, hy - 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Hair strand highlights
            ctx.strokeStyle = '#f87171';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(hx - 18, hy + 10);
            ctx.quadraticCurveTo(hx - 20 + wave, hy + 45, hx - 12 + wave, hy + 68);
            ctx.moveTo(hx + 18, hy + 10);
            ctx.quadraticCurveTo(hx + 20 - wave, hy + 45, hx + 12 - wave, hy + 68);
            ctx.stroke();

            ctx.restore();
        }

        renderRedHairFront(skeleton) {
            const ctx = this.ctx;
            const neck = skeleton.getBone('neck');
            if (!neck) return;
            const hx = neck.worldEndX;
            const hy = neck.worldEndY - 18;

            ctx.save();
            ctx.fillStyle = '#dc2626';
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 2.5;

            // Stylish bangs sweeping across forehead
            ctx.beginPath();
            ctx.moveTo(hx - 24, hy - 10);
            ctx.bezierCurveTo(hx - 15, hy - 26, hx + 10, hy - 26, hx + 24, hy - 8);
            ctx.quadraticCurveTo(hx + 12, hy - 14, hx + 2, hy - 8);
            ctx.quadraticCurveTo(hx - 10, hy - 16, hx - 24, hy - 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }

        renderTopHat(skeleton) {
            const ctx = this.ctx;
            const neck = skeleton.getBone('neck');
            if (!neck) return;
            const hx = neck.worldEndX;
            const hy = neck.worldEndY - 18;
            const r = 24;

            ctx.save();

            // Hat Crown (Tall Cylinder)
            const crownW = 34;
            const crownTopW = 38;
            const crownH = 42;
            const hatBaseY = hy - r + 3;
            const hatTopY = hatBaseY - crownH;

            ctx.fillStyle = '#18181b';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;

            // Crown body trapezoid
            ctx.beginPath();
            ctx.moveTo(hx - crownW / 2, hatBaseY);
            ctx.lineTo(hx - crownTopW / 2, hatTopY);
            ctx.lineTo(hx + crownTopW / 2, hatTopY);
            ctx.lineTo(hx + crownW / 2, hatBaseY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Crown Top Oval
            ctx.beginPath();
            ctx.ellipse(hx, hatTopY, crownTopW / 2, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Silk Ribbon Band (Crimson Red)
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.rect(hx - crownW / 2 + 1, hatBaseY - 10, crownW - 2, 8);
            ctx.fill();

            // Hat Brim (Wide Oval)
            ctx.fillStyle = '#18181b';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(hx, hatBaseY, 32, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Shine highlight on hat side
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(hx - crownW / 2 + 5, hatBaseY - 12);
            ctx.lineTo(hx - crownTopW / 2 + 6, hatTopY + 5);
            ctx.stroke();

            ctx.restore();
        }

        renderMustache(skeleton) {
            const ctx = this.ctx;
            const neck = skeleton.getBone('neck');
            if (!neck) return;
            const hx = neck.worldEndX;
            const hy = neck.worldEndY - 18;
            const my = hy + 4; // Between eyes and mouth

            ctx.save();
            ctx.fillStyle = '#18181b';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;

            // Left Handlebar Curl
            ctx.beginPath();
            ctx.moveTo(hx, my);
            ctx.bezierCurveTo(hx - 8, my + 8, hx - 18, my + 6, hx - 22, my - 2);
            ctx.quadraticCurveTo(hx - 18, my + 1, hx - 10, my + 2);
            ctx.quadraticCurveTo(hx - 4, my + 1, hx, my);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Right Handlebar Curl
            ctx.beginPath();
            ctx.moveTo(hx, my);
            ctx.bezierCurveTo(hx + 8, my + 8, hx + 18, my + 6, hx + 22, my - 2);
            ctx.quadraticCurveTo(hx + 18, my + 1, hx + 10, my + 2);
            ctx.quadraticCurveTo(hx + 4, my + 1, hx, my);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }

        renderBowtie(skeleton) {
            const ctx = this.ctx;
            const neck = skeleton.getBone('neck');
            if (!neck) return;
            const nx = neck.worldEndX;
            const ny = neck.worldEndY - 4;

            ctx.save();
            ctx.fillStyle = '#dc2626';
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 2;

            // Left wing
            ctx.beginPath();
            ctx.moveTo(nx, ny);
            ctx.lineTo(nx - 12, ny - 6);
            ctx.lineTo(nx - 12, ny + 6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Right wing
            ctx.beginPath();
            ctx.moveTo(nx, ny);
            ctx.lineTo(nx + 12, ny - 6);
            ctx.lineTo(nx + 12, ny + 6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Center knot
            ctx.fillStyle = '#b91c1c';
            ctx.beginPath();
            ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }

        renderWalkingCane(skeleton) {
            const ctx = this.ctx;
            const hand = skeleton.getBone('hand_r') || skeleton.getBone('arm_r_lower');
            if (!hand) return;

            const hx = hand.worldEndX;
            const hy = hand.worldEndY;
            const groundY = this.getGroundY();

            ctx.save();
            ctx.lineCap = 'round';

            // Polished brass knob at the top
            ctx.fillStyle = '#f59e0b';
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(hx, hy - 4, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Brass ferrule collar
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(hx - 3.5, hy + 2, 7, 5);

            // Dark mahogany cane shaft down to ground
            ctx.strokeStyle = '#451a03';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(hx, hy + 5);
            ctx.lineTo(hx + 4, groundY);
            ctx.stroke();

            // Rubber cane tip
            ctx.fillStyle = '#18181b';
            ctx.fillRect(hx + 2, groundY - 4, 6, 4);

            ctx.restore();
        }

        renderHeadphones(skeleton) {
            const ctx = this.ctx;
            const neck = skeleton.getBone('neck');
            if (!neck) return;
            const hx = neck.worldEndX;
            const hy = neck.worldEndY - 18;
            const r = 24;

            ctx.save();

            // Headband arch
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(hx, hy, r + 4, Math.PI * 0.95, Math.PI * 2.05, false);
            ctx.stroke();

            // Cushion lining
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(hx, hy, r + 2, Math.PI * 1.05, Math.PI * 1.95, false);
            ctx.stroke();

            // Left Ear Cup
            const cupW = 10;
            const cupH = 26;
            const leftX = hx - r - 4;
            const cupY = hy - 4;

            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(leftX - 2, cupY - cupH / 2, cupW, cupH, 5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.roundRect(leftX - 6, cupY - cupH / 2 + 2, 5, cupH - 4, 3);
            ctx.fill();
            ctx.stroke();

            // Right Ear Cup
            const rightX = hx + r + 4;
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.roundRect(rightX - 8, cupY - cupH / 2, cupW, cupH, 5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.roundRect(rightX + 1, cupY - cupH / 2 + 2, 5, cupH - 4, 3);
            ctx.fill();
            ctx.stroke();

            // Floating animated music notes
            const t = skeleton.animController ? skeleton.animController.time : 0;
            const noteY1 = hy - 30 - ((t * 22) % 25);
            const noteY2 = hy - 25 - (((t + 0.6) * 22) % 25);
            ctx.fillStyle = '#38bdf8';
            ctx.font = '16px sans-serif';
            ctx.fillText('🎵', hx - r - 22, noteY1);
            ctx.fillText('🎶', hx + r + 10, noteY2);

            ctx.restore();
        }

        renderGoldPhone(skeleton) {
            const ctx = this.ctx;
            const hand = skeleton.getBone('hand_r') || skeleton.getBone('arm_r_lower');
            if (!hand) return;

            const hx = hand.worldEndX;
            const hy = hand.worldEndY;
            const t = skeleton.animController ? skeleton.animController.time : 0;

            ctx.save();

            // Radiant golden phone body
            const pw = 16;
            const ph = 30;
            const px = hx - 5;
            const py = hy - 25;

            // Golden Glow aura
            ctx.shadowColor = 'rgba(250, 204, 21, 0.8)';
            ctx.shadowBlur = 12;

            ctx.fillStyle = '#facc15';
            ctx.strokeStyle = '#ca8a04';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(px, py, pw, ph, 4);
            ctx.fill();
            ctx.stroke();

            // Screen & Camera lenses
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(px + 2, py + 2, 6, 6);
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.arc(px + 4, py + 4, 1.5, 0, Math.PI * 2);
            ctx.arc(px + 6, py + 6, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Pulsing star sparkles (✨)
            ctx.shadowBlur = 0;
            const pulse = 1 + Math.sin(t * 8) * 0.25;
            ctx.fillStyle = '#fef08a';
            ctx.font = `${Math.round(18 * pulse)}px sans-serif`;
            ctx.fillText('✨', px - 18, py - 2);
            ctx.fillText('✨', px + pw + 4, py + 12);
            ctx.fillText('⭐', px - 12, py + ph + 8);

            ctx.restore();
        }

        renderAccordionCrashEffect(skeleton) {
            const ctx = this.ctx;
            const t = skeleton.animController ? skeleton.animController.time : 0;
            const rootX = skeleton.root.worldX;
            const groundY = this.getGroundY();

            ctx.save();

            // Pelvis squashed low
            const pelvisY = groundY - 24;
            const headY = groundY - 70;
            const accordionH = pelvisY - headY;

            // Accordion Torso (4 zig-zag folds with bounce vibration)
            const vibrate = Math.sin(t * 40) * 4;
            const foldW = 32 + Math.abs(Math.sin(t * 25)) * 8;

            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 7;
            ctx.lineJoin = 'miter';
            ctx.beginPath();
            ctx.moveTo(rootX, pelvisY);
            ctx.lineTo(rootX + foldW + vibrate, pelvisY - accordionH * 0.25);
            ctx.lineTo(rootX - foldW - vibrate, pelvisY - accordionH * 0.5);
            ctx.lineTo(rootX + foldW + vibrate, pelvisY - accordionH * 0.75);
            ctx.lineTo(rootX, headY);
            ctx.stroke();

            // Splayed squashed limbs
            ctx.lineWidth = 5;
            ctx.beginPath();
            // Left leg
            ctx.moveTo(rootX - 10, pelvisY);
            ctx.lineTo(rootX - 35, groundY);
            // Right leg
            ctx.moveTo(rootX + 10, pelvisY);
            ctx.lineTo(rootX + 35, groundY);
            // Left arm
            ctx.moveTo(rootX - 15, headY + 15);
            ctx.lineTo(rootX - 45, headY + 30);
            // Right arm
            ctx.moveTo(rootX + 15, headY + 15);
            ctx.lineTo(rootX + 45, headY + 30);
            ctx.stroke();

            // Head (Squashed oval)
            ctx.fillStyle = '#ffffff';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.ellipse(rootX, headY, 26, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Eyeballs POPPING OUT ON STALKS!
            const stalkLen = 28 + Math.sin(t * 30) * 4;
            ctx.lineWidth = 2.5;
            // Left eye stalk & popped eyeball
            ctx.beginPath();
            ctx.moveTo(rootX - 10, headY - 4);
            ctx.quadraticCurveTo(rootX - 25, headY - 20, rootX - 22, headY - stalkLen);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(rootX - 22, headY - stalkLen, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#dc2626'; // Red panic pupil
            ctx.beginPath();
            ctx.arc(rootX - 22, headY - stalkLen, 3, 0, Math.PI * 2);
            ctx.fill();

            // Right eye stalk & popped eyeball
            ctx.beginPath();
            ctx.moveTo(rootX + 10, headY - 4);
            ctx.quadraticCurveTo(rootX + 25, headY - 20, rootX + 22, headY - stalkLen);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(rootX + 22, headY - stalkLen, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(rootX + 22, headY - stalkLen, 3, 0, Math.PI * 2);
            ctx.fill();

            // Huge Screaming Mouth
            ctx.fillStyle = '#b91c1c';
            ctx.beginPath();
            ctx.ellipse(rootX, headY + 6, 10, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Circling dizzy stars above head
            const starAngle = t * 6;
            for (let i = 0; i < 3; i++) {
                const sa = starAngle + (i * Math.PI * 2 / 3);
                const sx = rootX + Math.cos(sa) * 36;
                const sy = headY - stalkLen - 15 + Math.sin(sa) * 10;
                ctx.fillStyle = '#facc15';
                ctx.font = '16px sans-serif';
                ctx.fillText('⭐', sx - 8, sy + 6);
            }

            // Impact dust puff at feet
            ctx.fillStyle = 'rgba(203, 213, 225, 0.7)';
            ctx.beginPath();
            ctx.arc(rootX - 35, groundY - 8, 12, 0, Math.PI * 2);
            ctx.arc(rootX + 35, groundY - 8, 12, 0, Math.PI * 2);
            ctx.arc(rootX, groundY - 14, 15, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        renderWaterfallTearsAndMoth(skeleton) {
            const ctx = this.ctx;
            const neck = skeleton.getBone('neck');
            if (!neck) return;

            const hx = neck.worldEndX;
            const hy = neck.worldEndY - 18;
            const groundY = this.getGroundY();
            const t = skeleton.animController ? skeleton.animController.time : 0;

            ctx.save();

            // Dual High-Pressure Waterfall Tear Fountains
            ctx.strokeStyle = '#38bdf8';
            ctx.fillStyle = '#bae6fd';
            ctx.lineWidth = 4;
            const sprayH = 45 + Math.sin(t * 12) * 8;

            // Left fountain arc
            ctx.beginPath();
            ctx.moveTo(hx - 8, hy);
            ctx.bezierCurveTo(hx - 30, hy - sprayH, hx - 65, hy - sprayH * 0.6, hx - 55, groundY);
            ctx.lineTo(hx - 48, groundY);
            ctx.bezierCurveTo(hx - 58, hy - sprayH * 0.5, hx - 24, hy - sprayH * 0.8, hx - 6, hy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Right fountain arc
            ctx.beginPath();
            ctx.moveTo(hx + 8, hy);
            ctx.bezierCurveTo(hx + 30, hy - sprayH, hx + 65, hy - sprayH * 0.6, hx + 55, groundY);
            ctx.lineTo(hx + 48, groundY);
            ctx.bezierCurveTo(hx + 58, hy - sprayH * 0.5, hx + 24, hy - sprayH * 0.8, hx + 6, hy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Water puddles at landing feet
            ctx.fillStyle = '#7dd3fc';
            ctx.beginPath();
            ctx.ellipse(hx - 52, groundY, 18, 5, 0, 0, Math.PI * 2);
            ctx.ellipse(hx + 52, groundY, 18, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Empty Pocket Liners Turned Out
            const pelvis = skeleton.getBone('pelvis');
            const px = pelvis ? pelvis.worldX : hx;
            const py = pelvis ? pelvis.worldY : groundY - 45;

            ctx.fillStyle = '#f8fafc';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;

            // Left pocket liner
            ctx.beginPath();
            ctx.moveTo(px - 10, py);
            ctx.lineTo(px - 22, py + 8);
            ctx.lineTo(px - 14, py + 14);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Right pocket liner
            ctx.beginPath();
            ctx.moveTo(px + 10, py);
            ctx.lineTo(px + 22, py + 8);
            ctx.lineTo(px + 14, py + 14);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Animated Cartoon Moth Fluttering Upward Out of Pocket!
            const mothY = py - ((t * 26) % 55);
            const mothX = px + 18 + Math.sin(t * 10) * 12;
            const flap = Math.sin(t * 30) * 4;

            ctx.fillStyle = '#cbd5e1';
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.5;
            // Moth left wing
            ctx.beginPath();
            ctx.ellipse(mothX - 5, mothY, 6, Math.abs(flap) + 2, -0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Moth right wing
            ctx.beginPath();
            ctx.ellipse(mothX + 5, mothY, 6, Math.abs(flap) + 2, 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Moth body
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.ellipse(mothX, mothY, 2, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        renderWheelchairBack(skeleton) {
            const ctx = this.ctx;
            const rootX = skeleton.root.worldX;
            const groundY = this.getGroundY();

            ctx.save();
            // Wheelchair Seat & Backrest Frame
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 5;
            ctx.beginPath();
            // Backrest
            ctx.moveTo(rootX - 22, groundY - 75);
            ctx.lineTo(rootX - 18, groundY - 32);
            // Seat horizontal bar
            ctx.lineTo(rootX + 18, groundY - 32);
            ctx.stroke();

            // Handle grip
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(rootX - 30, groundY - 78, 12, 6);

            ctx.restore();
        }

        renderWheelchairFront(skeleton) {
            const ctx = this.ctx;
            const rootX = skeleton.root.worldX;
            const groundY = this.getGroundY();

            ctx.save();
            const wheelX = rootX - 6;
            const wheelY = groundY - 26;
            const wheelR = 26;

            // 1. Big Wheelchair Main Wheel Rim
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(wheelX, wheelY, wheelR, 0, Math.PI * 2);
            ctx.stroke();

            // Outer chrome handrim
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(wheelX, wheelY, wheelR - 4, 0, Math.PI * 2);
            ctx.stroke();

            // Central Wheel Hub
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(wheelX, wheelY, 5, 0, Math.PI * 2);
            ctx.fill();

            // Radial Spokes
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 8; i++) {
                const a = i * Math.PI / 4;
                ctx.beginPath();
                ctx.moveTo(wheelX, wheelY);
                ctx.lineTo(wheelX + Math.cos(a) * (wheelR - 2), wheelY + Math.sin(a) * (wheelR - 2));
                ctx.stroke();
            }

            // Small front caster wheel
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(rootX + 26, groundY - 8, 7, 0, Math.PI * 2);
            ctx.fill();

            // 2. Thick White Orthopedic Plaster Cast on Right Leg!
            ctx.fillStyle = '#f8fafc';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.roundRect(rootX + 8, groundY - 30, 36, 18, 5);
            ctx.fill();
            ctx.stroke();

            // Bandage wrap texture lines
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(rootX + 16, groundY - 30); ctx.lineTo(rootX + 14, groundY - 12);
            ctx.moveTo(rootX + 26, groundY - 30); ctx.lineTo(rootX + 24, groundY - 12);
            ctx.moveTo(rootX + 36, groundY - 30); ctx.lineTo(rootX + 34, groundY - 12);
            ctx.stroke();

            // 5 Cute pink wiggling cartoon toes sticking out of cast!
            ctx.fillStyle = '#fbcfe8';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            for (let t = 0; t < 5; t++) {
                ctx.beginPath();
                ctx.arc(rootX + 44 + (t > 0 ? (t - 1) * 2 : 0), groundY - 26 + t * 3, 2.5 - t * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            ctx.restore();
        }

        renderBoneList(skeleton, boneOrder) {
            const ctx = this.ctx;
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (const name of boneOrder) {
                const bone = skeleton.getBone(name);
                if (!bone || bone.length <= 0) continue;

                ctx.lineWidth = (name.includes('spine') || name.includes('pelvis')) ? 7 : 5;
                ctx.strokeStyle = bone.color || '#111111';

                ctx.beginPath();
                ctx.moveTo(bone.worldX, bone.worldY);
                ctx.lineTo(bone.worldEndX, bone.worldEndY);
                ctx.stroke();

                ctx.fillStyle = '#111111';
                ctx.beginPath();
                ctx.arc(bone.worldX, bone.worldY, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        renderBones(skeleton) {
            this.renderBoneList(skeleton, [
                'leg_l_upper', 'leg_l_lower', 'foot_l',
                'leg_r_upper', 'leg_r_lower', 'foot_r',
                'pelvis', 'spine', 'neck',
                'arm_l_upper', 'arm_l_lower', 'hand_l',
                'arm_r_upper', 'arm_r_lower', 'hand_r'
            ]);
        }

        renderHead(skeleton) {
            const ctx = this.ctx;
            const neck = skeleton.getBone('neck');
            if (!neck) return;

            const headX = neck.worldEndX;
            const headY = neck.worldEndY - 18;
            const headRadius = 24;

            ctx.save();

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            const exp = skeleton.expression;

            if (exp.headProp === 'bandage') {
                ctx.fillStyle = '#fef08a';
                ctx.strokeStyle = '#854d0e';
                ctx.lineWidth = 2;
                ctx.fillRect(headX - 22, headY - 18, 44, 12);
                ctx.strokeRect(headX - 22, headY - 18, 44, 12);
                ctx.strokeStyle = '#dc2626';
                ctx.beginPath();
                ctx.moveTo(headX, headY - 16); ctx.lineTo(headX, headY - 8);
                ctx.moveTo(headX - 4, headY - 12); ctx.lineTo(headX + 4, headY - 12);
                ctx.stroke();
            }

            this.renderFace(ctx, headX, headY, exp, skeleton);
            ctx.restore();
        }

        renderFace(ctx, x, y, exp, skeleton) {
            const eyeOffsetX = 8;
            const eyeY = y - 4;

            if (exp.headProp === 'sunglasses' || exp.eyeType === 'shades') {
                ctx.fillStyle = '#0f172a';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - 18, eyeY - 6);
                ctx.lineTo(x + 18, eyeY - 6);
                ctx.lineTo(x + 15, eyeY + 8);
                ctx.lineTo(x + 2, eyeY + 8);
                ctx.lineTo(x, eyeY + 2);
                ctx.lineTo(x - 2, eyeY + 2);
                ctx.lineTo(x - 15, eyeY + 8);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                return;
            }

            ctx.lineWidth = 3;
            ctx.strokeStyle = '#111111';
            if (exp.browType === 'worried') {
                ctx.beginPath();
                ctx.moveTo(x - 14, eyeY - 14); ctx.lineTo(x - 3, eyeY - 10);
                ctx.moveTo(x + 14, eyeY - 14); ctx.lineTo(x + 3, eyeY - 10);
                ctx.stroke();
            } else if (exp.browType === 'raised') {
                ctx.beginPath();
                ctx.arc(x - 7, eyeY - 12, 6, Math.PI, 0);
                ctx.arc(x + 7, eyeY - 12, 6, Math.PI, 0);
                ctx.stroke();
            }

            if (exp.eyeType === 'dead_x') {
                ctx.lineWidth = 3;
                [-eyeOffsetX, eyeOffsetX].forEach(ox => {
                    ctx.beginPath();
                    ctx.moveTo(x + ox - 4, eyeY - 4); ctx.lineTo(x + ox + 4, eyeY + 4);
                    ctx.moveTo(x + ox + 4, eyeY - 4); ctx.lineTo(x + ox - 4, eyeY + 4);
                    ctx.stroke();
                });
            } else if (exp.eyeType === 'wide_shock') {
                [-eyeOffsetX, eyeOffsetX].forEach(ox => {
                    ctx.fillStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(x + ox, eyeY, 7, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(x + ox, eyeY, 2, 0, Math.PI * 2);
                    ctx.fill();
                });
            } else if (exp.eyeType === 'happy_curved') {
                ctx.lineWidth = 3;
                [-eyeOffsetX, eyeOffsetX].forEach(ox => {
                    ctx.beginPath();
                    ctx.arc(x + ox, eyeY + 2, 5, Math.PI * 1.1, Math.PI * 1.9);
                    ctx.stroke();
                });
            } else {
                ctx.fillStyle = '#111111';
                [-eyeOffsetX, eyeOffsetX].forEach(ox => {
                    ctx.beginPath();
                    ctx.arc(x + ox, eyeY, 3, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            // Eyelashes (Mom)
            if (skeleton && skeleton.hasEyelashes) {
                ctx.strokeStyle = '#111111';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - eyeOffsetX - 4, eyeY - 4); ctx.lineTo(x - eyeOffsetX - 9, eyeY - 7);
                ctx.moveTo(x - eyeOffsetX - 2, eyeY - 6); ctx.lineTo(x - eyeOffsetX - 5, eyeY - 11);
                ctx.moveTo(x + eyeOffsetX + 4, eyeY - 4); ctx.lineTo(x + eyeOffsetX + 9, eyeY - 7);
                ctx.moveTo(x + eyeOffsetX + 2, eyeY - 6); ctx.lineTo(x + eyeOffsetX + 5, eyeY - 11);
                ctx.stroke();
            }

            // Cheek Blush (Mom)
            if (skeleton && skeleton.hasBlush) {
                ctx.fillStyle = 'rgba(251, 113, 133, 0.45)';
                ctx.beginPath();
                ctx.arc(x - 14, y + 4, 5, 0, Math.PI * 2);
                ctx.arc(x + 14, y + 4, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            const mouthY = y + 10;
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#111111';
            if (exp.mouthType === 'grin' || exp.mouthType === 'smile') {
                ctx.beginPath();
                ctx.arc(x, mouthY - 3, 10, 0.2 * Math.PI, 0.8 * Math.PI);
                ctx.stroke();
            } else if (exp.mouthType === 'open_shock' || exp.mouthType === 'screaming') {
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.ellipse(x, mouthY + 2, 6, 9, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (exp.mouthType === 'frown') {
                ctx.beginPath();
                ctx.arc(x, mouthY + 8, 10, 1.2 * Math.PI, 1.8 * Math.PI);
                ctx.stroke();
            } else if (exp.mouthType === 'smug') {
                ctx.beginPath();
                ctx.moveTo(x - 6, mouthY);
                ctx.quadraticCurveTo(x, mouthY + 4, x + 8, mouthY - 3);
                ctx.stroke();
            }

            if (exp.tearDrop) {
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(x - 14, eyeY + 12, 4, 0, Math.PI * 2);
                ctx.arc(x + 14, eyeY + 12, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            if (exp.extraEffect === 'sweat_drops') {
                ctx.fillStyle = '#0284c7';
                ctx.beginPath();
                ctx.arc(x + 24, y - 10, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        renderSceneBack(sceneType) {
            const ctx = this.ctx;
            const cw = ctx.canvas.width;
            const ch = ctx.canvas.height;
            const groundY = this.getGroundY();
            const t = performance.now() / 1000;

            ctx.save();

            // Helper for comic visual banners / floating picture badges (visual cues instead of wall of text)
            const drawSceneBanner = (bgTop, bgBot) => {
                const grad = ctx.createLinearGradient(0, 0, 0, groundY);
                grad.addColorStop(0, bgTop);
                grad.addColorStop(1, bgBot);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, cw, groundY);
            };

            const drawGround = (color = '#cbd5e1', lineColor = '#64748b') => {
                ctx.fillStyle = color;
                ctx.fillRect(0, groundY, cw, ch - groundY);
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, groundY);
                ctx.lineTo(cw, groundY);
                ctx.stroke();
            };

            const drawPropBubble = (x, y, emoji, scale = 1, bg = 'rgba(255,255,255,0.92)', borderColor = '#0f172a') => {
                const floatY = y + Math.sin(t * 3 + x * 0.02) * 5;
                ctx.save();
                ctx.fillStyle = bg;
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(x, floatY, 24 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.font = `${Math.round(24 * scale)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(emoji, x, floatY + 2);
                ctx.restore();
            };

            // Reusable Modern Glass Skyscraper Skyline for Savings / Finance / Career Scenes
            const drawSkyscraperBackdrop = (palette = 'emerald') => {
                const styles = {
                    emerald: { body: ['#a7f3d0', '#6ee7b7', '#99f6e4'], border: 'rgba(15, 118, 110, 0.35)', win: 'rgba(255, 255, 255, 0.72)' },
                    blue:    { body: ['#bfdbfe', '#93c5fd', '#bae6fd'], border: 'rgba(30, 64, 175, 0.32)', win: 'rgba(255, 255, 255, 0.75)' },
                    gold:    { body: ['#fde68a', '#fcd34d', '#fed7aa'], border: 'rgba(180, 83, 9, 0.32)',   win: 'rgba(255, 255, 255, 0.75)' },
                    indigo:  { body: ['#c7d2fe', '#a5b4fc', '#bfdbfe'], border: 'rgba(55, 48, 163, 0.32)',  win: 'rgba(255, 255, 255, 0.75)' }
                };
                const st = styles[palette] || styles.emerald;
                const specs = [
                    { rx: 0.02, w: 78,  h: 215, spire: false },
                    { rx: 0.11, w: 92,  h: 285, spire: true  },
                    { rx: 0.22, w: 68,  h: 175, spire: false },
                    { rx: 0.31, w: 96,  h: 255, spire: true  },
                    { rx: 0.62, w: 88,  h: 270, spire: true  },
                    { rx: 0.73, w: 102, h: 225, spire: false },
                    { rx: 0.84, w: 82,  h: 295, spire: true  },
                    { rx: 0.92, w: 74,  h: 185, spire: false }
                ];
                ctx.save();
                specs.forEach((b, idx) => {
                    const bx = Math.round(cw * b.rx);
                    const bh = Math.min(b.h, Math.max(115, groundY - 36));
                    const by = groundY - bh;
                    ctx.fillStyle = st.body[idx % st.body.length];
                    ctx.strokeStyle = st.border;
                    ctx.lineWidth = 2;
                    ctx.fillRect(bx, by, b.w, bh);
                    ctx.strokeRect(bx, by, b.w, bh);

                    // Stepped modern crown & spire
                    if (b.spire) {
                        ctx.fillRect(bx + b.w * 0.22, by - 14, b.w * 0.56, 14);
                        ctx.strokeRect(bx + b.w * 0.22, by - 14, b.w * 0.56, 14);
                        ctx.beginPath();
                        ctx.moveTo(bx + b.w / 2, by - 14);
                        ctx.lineTo(bx + b.w / 2, by - 42);
                        ctx.stroke();
                    }

                    // Clean daylight glass window grid
                    ctx.fillStyle = st.win;
                    const cols = Math.max(3, Math.floor((b.w - 18) / 18));
                    const rows = Math.max(4, Math.floor((bh - 20) / 22));
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            ctx.fillRect(bx + 10 + c * 17, by + 12 + r * 20, 10, 12);
                        }
                    }
                });
                ctx.restore();
            };

            // Default ground & backdrop
            drawSceneBanner('#e0f2fe', '#f1f5f9');
            drawGround('#e2e8f0', '#94a3b8');

            /* ==============================================================
               A. OPENING PROLOGUE SCENES (Ages 0 ~ 18 Visual Cutscenes)
               ============================================================== */
            if (sceneType === 'prologue_baby') {
                drawSceneBanner('#fef3c7', '#fde68a');
                drawGround('#fed7aa', '#d97706');

                // Nursery Window with Starry Night outside
                const wx = cw / 2 - 260;
                const wy = 40;
                ctx.fillStyle = '#1e1b4b';
                ctx.strokeStyle = '#92400e';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.roundRect(wx, wy, 110, 95, 10);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#fde047';
                ctx.font = '22px sans-serif';
                ctx.fillText('🌙', wx + 20, wy + 40);
                ctx.font = '14px sans-serif';
                ctx.fillText('✨', wx + 65, wy + 35);
                ctx.fillText('⭐', wx + 55, wy + 75);

                // Spinning Crib Mobile overhead
                const mx = cw / 2;
                const my = Math.max(45, groundY - 210);
                ctx.strokeStyle = '#b45309';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(mx, 0);
                ctx.lineTo(mx, my);
                ctx.moveTo(mx - 60, my);
                ctx.lineTo(mx + 60, my);
                ctx.stroke();
                const swing = Math.sin(t * 2.5) * 10;
                ctx.font = '22px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⭐', mx - 55 + swing, my + 30);
                ctx.fillText('🍼', mx + swing * 0.5, my + 38);
                ctx.fillText('🧸', mx + 55 - swing, my + 30);

                // Rocking Wooden Baby Cradle in center
                const rock = Math.sin(t * 3) * 0.05;
                ctx.save();
                ctx.translate(cw / 2, groundY - 10);
                ctx.rotate(rock);
                ctx.fillStyle = '#f59e0b';
                ctx.strokeStyle = '#78350f';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.roundRect(-55, -62, 110, 52, 18);
                ctx.fill();
                ctx.stroke();

                // Soft blanket
                ctx.fillStyle = '#bae6fd';
                ctx.beginPath();
                ctx.roundRect(-48, -52, 96, 34, 12);
                ctx.fill();

                // Cute Baby Head + Pacifier
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#111111';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.arc(-18, -46, 17, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Curved sleeping eyes
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(-23, -48, 3, 0, Math.PI);
                ctx.arc(-13, -48, 3, 0, Math.PI);
                ctx.stroke();
                // Pacifier
                ctx.fillStyle = '#fb7185';
                ctx.beginPath();
                ctx.arc(-15, -40, 5.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Floating Sleep Bubbles & Love Hearts
                for (let i = 0; i < 4; i++) {
                    const by = groundY - 75 - ((t * 28 + i * 28) % 95);
                    const bx = cw / 2 - 10 + Math.sin(t * 3 + i) * 18;
                    ctx.strokeStyle = '#38bdf8';
                    ctx.fillStyle = 'rgba(186, 230, 253, 0.6)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(bx, by, 5 + (i % 3) * 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.font = '26px sans-serif';
                ctx.fillText('❤️', cw / 2 - 75, groundY - 135 + Math.sin(t * 3) * 6);
                ctx.fillText('💕', cw / 2 + 55, groundY - 145 + Math.cos(t * 3) * 6);
                drawPropBubble(cw / 2 + 230, groundY - 160, '👶', 1.1, '#fef3c7', '#d97706');

            } else if (sceneType === 'prologue_school') {
                drawSceneBanner('#dbeafe', '#eff6ff');
                drawGround('#fde68a', '#ca8a04');

                // Classroom Blackboard with Little Red Flowers
                const bx = cw / 2 - 210;
                const by = Math.max(70, groundY - 295);
                ctx.fillStyle = '#14532d';
                ctx.strokeStyle = '#78350f';
                ctx.lineWidth = 7;
                ctx.beginPath();
                ctx.roundRect(bx, by, 420, 105, 8);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🌺 Honor Roll   1 + 1 = 2   🎵', cw / 2, by + 42);
                ctx.font = '24px sans-serif';
                ctx.fillText('🌸 🌸 🌸 🌸 🌸   📚 ✏️ 🎒', cw / 2, by + 80);
                ctx.textAlign = 'left';

                // School Desk with Stacked Workbooks
                ctx.fillStyle = '#d97706';
                ctx.fillRect(cw / 2 - 125, groundY - 58, 120, 14);
                ctx.fillStyle = '#92400e';
                ctx.fillRect(cw / 2 - 115, groundY - 44, 10, 44);
                ctx.fillRect(cw / 2 - 25, groundY - 44, 10, 44);

                // Ice pops & music notes between Player and Friend
                drawPropBubble(cw / 2 + 15, groundY - 145, '🍧', 1.0, '#fce7f3', '#db2777');
                drawPropBubble(cw / 2 - 95, groundY - 150, '🎒', 1.0, '#dcfce7', '#16a34a');
                drawPropBubble(cw / 2 + 145, groundY - 155, '🎧', 1.0, '#e0f2fe', '#0284c7');

            } else if (sceneType === 'prologue_teen') {
                // Warm Sunset Sky Gradient
                drawSceneBanner('#fb923c', '#fde047');
                drawGround('#475569', '#1e293b');

                // Drifting golden evening clouds to balance the full-screen sky
                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                for (let i = 0; i < 3; i++) {
                    const clX = ((t * 14 + i * 320) % (cw + 220)) - 110;
                    const clY = 85 + i * 42;
                    ctx.beginPath();
                    ctx.arc(clX, clY, 28, 0, Math.PI * 2);
                    ctx.arc(clX + 26, clY - 10, 34, 0, Math.PI * 2);
                    ctx.arc(clX + 54, clY, 26, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Moving Road Dashes
                ctx.fillStyle = '#f8fafc';
                const roadOffset = (t * 160) % 80;
                for (let x = -80; x < cw + 80; x += 80) {
                    ctx.fillRect(x - roadOffset, groundY + 20, 42, 6);
                }

                // Giant Glowing Setting Sun
                ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
                ctx.beginPath();
                ctx.arc(cw - 110, Math.max(95, groundY - 220), 48, 0, Math.PI * 2);
                ctx.fill();

                // Countdown Board + Parents' Warm Milk & Oranges high above Dad's Top Hat
                const boardX = Math.max(24, cw / 2 - 430);
                const boardY = Math.max(70, groundY - 345);
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.roundRect(boardX, boardY, 145, 80, 10);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#f8fafc';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⏳ Study Prep', boardX + 72, boardY + 26);
                ctx.font = '26px sans-serif';
                ctx.fillText('🥛 🍊 📚', boardX + 72, boardY + 62);
                ctx.textAlign = 'left';

            } else if (sceneType === 'prologue_adult18' || sceneType === 'university') {
                drawSceneBanner('#dbeafe', '#eff6ff');
                drawGround('#cbd5e1', '#64748b');

                const gx = cw / 2;

                // Grand UTAR University Campus Building in Background
                const bldgW = Math.min(620, cw - 60);
                const wingH = Math.min(185, Math.max(125, groundY - 125));
                const centerW = Math.min(280, bldgW * 0.46);
                const centerH = Math.min(235, Math.max(165, groundY - 85));
                const bldgLeft = gx - bldgW / 2;

                // Left & Right Academic Wings
                ctx.fillStyle = '#fefce8';
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 2.5;
                ctx.fillRect(bldgLeft, groundY - wingH, bldgW, wingH);
                ctx.strokeRect(bldgLeft, groundY - wingH, bldgW, wingH);

                // Royal Blue UTAR Wing Roofs
                ctx.fillStyle = '#1e3a8a';
                ctx.fillRect(bldgLeft - 8, groundY - wingH - 12, bldgW + 16, 14);
                ctx.fillStyle = '#eab308';
                ctx.fillRect(bldgLeft - 6, groundY - wingH + 2, bldgW + 12, 4);

                // Wing Classroom Windows
                const wingWinCols = Math.max(2, Math.floor(((bldgW - centerW) / 2 - 24) / 34));
                const wingWinRows = Math.max(2, Math.floor((wingH - 42) / 36));
                for (let side = -1; side <= 1; side += 2) {
                    const startX = side < 0 ? bldgLeft + 18 : gx + centerW / 2 + 16;
                    for (let r = 0; r < wingWinRows; r++) {
                        for (let c = 0; c < wingWinCols; c++) {
                            const wx = startX + c * 34;
                            const wy = groundY - wingH + 20 + r * 34;
                            ctx.fillStyle = '#93c5fd';
                            ctx.strokeStyle = '#1e3a8a';
                            ctx.lineWidth = 1.5;
                            ctx.fillRect(wx, wy, 22, 22);
                            ctx.strokeRect(wx, wy, 22, 22);
                        }
                    }
                }

                // Central UTAR Heritage Hall Facade & Pediment
                const cLeft = gx - centerW / 2;
                const cTop = groundY - centerH;
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 2.5;
                ctx.fillRect(cLeft, cTop, centerW, centerH);
                ctx.strokeRect(cLeft, cTop, centerW, centerH);

                // Classical UTAR Pediment Roof Triangle (Royal Blue + Gold Border)
                ctx.fillStyle = '#1e3a8a';
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.moveTo(cLeft - 18, cTop + 2);
                ctx.lineTo(gx, cTop - 52);
                ctx.lineTo(cLeft + centerW + 18, cTop + 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Iconic UTAR Emblem / Crest inside Pediment (Blue-Gold Shield + Radiant Sun + Open Book)
                const crestY = cTop - 22;
                ctx.save();
                // Golden outer shield
                ctx.fillStyle = '#facc15';
                ctx.strokeStyle = '#1e3a8a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(gx - 19, crestY - 16);
                ctx.lineTo(gx + 19, crestY - 16);
                ctx.lineTo(gx + 17, crestY + 4);
                ctx.quadraticCurveTo(gx, crestY + 20, gx, crestY + 20);
                ctx.quadraticCurveTo(gx, crestY + 20, gx - 17, crestY + 4);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Royal blue inner shield
                ctx.fillStyle = '#1d4ed8';
                ctx.beginPath();
                ctx.moveTo(gx - 14, crestY - 12);
                ctx.lineTo(gx + 14, crestY - 12);
                ctx.lineTo(gx + 13, crestY + 2);
                ctx.quadraticCurveTo(gx, crestY + 14, gx, crestY + 14);
                ctx.quadraticCurveTo(gx, crestY + 14, gx - 13, crestY + 2);
                ctx.closePath();
                ctx.fill();

                // Radiant golden sun / torch rays (top half of crest)
                ctx.strokeStyle = '#fde047';
                ctx.lineWidth = 1.6;
                for (let a = -2; a <= 2; a++) {
                    const ang = -Math.PI / 2 + a * 0.36;
                    ctx.beginPath();
                    ctx.moveTo(gx, crestY - 2);
                    ctx.lineTo(gx + Math.cos(ang) * 10, crestY - 2 + Math.sin(ang) * 9);
                    ctx.stroke();
                }
                ctx.fillStyle = '#fde047';
                ctx.beginPath();
                ctx.arc(gx, crestY - 2, 4, Math.PI, 0);
                ctx.fill();

                // Open Book symbol (bottom half of crest)
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(gx, crestY + 2);
                ctx.lineTo(gx - 10, crestY);
                ctx.lineTo(gx - 9, crestY + 7);
                ctx.lineTo(gx, crestY + 9);
                ctx.lineTo(gx + 9, crestY + 7);
                ctx.lineTo(gx + 10, crestY);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                // Prominent UTAR Building Signboard
                ctx.fillStyle = '#1e3a8a';
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(gx - 105, cTop + 10, 210, 42, 8);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#facc15';
                ctx.font = '900 24px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('UTAR', gx, cTop + 34);
                ctx.fillStyle = '#e0f2fe';
                ctx.font = 'bold 9px sans-serif';
                ctx.fillText('UNIVERSITI TUNKU ABDUL RAHMAN', gx, cTop + 47);

                // Grand Campus Pillars under UTAR Signboard
                ctx.fillStyle = '#e2e8f0';
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 2;
                [-105, -52, 52, 105].forEach((ox) => {
                    ctx.fillRect(gx + ox - 8, cTop + 60, 16, centerH - 60);
                    ctx.strokeRect(gx + ox - 8, cTop + 60, 16, centerH - 60);
                });

                // Campus Greenery Bushes flanking the building
                ctx.fillStyle = '#16a34a';
                [bldgLeft - 8, bldgLeft + 26, bldgLeft + bldgW - 26, bldgLeft + bldgW + 8].forEach((bx) => {
                    ctx.beginPath();
                    ctx.arc(bx, groundY - 12, 18, 0, Math.PI * 2);
                    ctx.fill();
                });

                // Grand University Entrance Arch Banner Framed Cleanly
                const archH = Math.min(255, groundY - 40);
                ctx.fillStyle = '#94a3b8';
                ctx.fillRect(gx - 220, groundY - archH, 24, archH);
                ctx.fillRect(gx + 196, groundY - archH, 24, archH);

                ctx.fillStyle = '#1e3a8a';
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.roundRect(gx - 245, groundY - archH - 18, 490, 46, 12);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#fef08a';
                ctx.font = 'bold 20px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🏛️ UTAR · Age 18 University Life Begins 🎓', gx, groundY - archH + 12);
                ctx.textAlign = 'left';

                // Falling Celebration Confetti
                const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899'];
                for (let i = 0; i < 22; i++) {
                    const cx = ((i * 67 + Math.sin(t * 2 + i) * 25) % cw);
                    const cy = ((t * 55 + i * 33) % (groundY - 20));
                    ctx.fillStyle = colors[i % colors.length];
                    ctx.fillRect(cx, cy, 8, 12);
                }
                drawPropBubble(gx, groundY - 188, '📜', 1.1, '#fef9c3', '#ca8a04');
            }

            /* ==============================================================
               B. 40 CHOICE CUTSCENES (Visual Animations per Decision)
               ============================================================== */
            // --- AGE 18 OPTIONS ---
            else if (sceneType === 'show_off_phone') {
                drawSceneBanner('#fef9c3', '#fde68a');
                drawGround('#cbd5e1', '#64748b');

                // Sleek Modern Apple / iPhone Flagship Storefront in Background
                const stW = Math.min(430, cw - 80);
                const stH = Math.min(225, Math.max(155, groundY - 58));
                const stX = cw / 2 - stW / 2;
                const stY = groundY - stH;
                ctx.save();
                // Brushed aluminum architectural facade
                ctx.fillStyle = '#e2e8f0';
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 3;
                ctx.fillRect(stX, stY, stW, stH);
                ctx.strokeRect(stX, stY, stW, stH);

                // Sleek dark top signboard with Apple icon + "iPhone Store"
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(stX, stY, stW, 46);
                // Vector bitten-apple emblem left of text
                const apX = cw / 2 - 86;
                const apY = stY + 25;
                ctx.fillStyle = '#f8fafc';
                ctx.beginPath();
                ctx.arc(apX - 4, apY + 2, 8.5, 0, Math.PI * 2);
                ctx.arc(apX + 4, apY + 2, 8.5, 0, Math.PI * 2);
                ctx.fill();
                // Bite notch
                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.arc(apX + 12, apY + 1, 5.2, 0, Math.PI * 2);
                ctx.fill();
                // Leaf on top
                ctx.fillStyle = '#f8fafc';
                ctx.beginPath();
                ctx.ellipse(apX + 2, apY - 10, 3.2, 5.5, 0.55, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#f8fafc';
                ctx.font = '800 22px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('iPhone Store', apX + 20, stY + 31);

                // Panoramic Clear Glass Curtain Wall
                const glassY = stY + 52;
                const glassH = stH - 52;
                const glassGrad = ctx.createLinearGradient(stX, glassY, stX, groundY);
                glassGrad.addColorStop(0, '#f8fafc');
                glassGrad.addColorStop(1, '#dbeafe');
                ctx.fillStyle = glassGrad;
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 2.5;
                ctx.fillRect(stX + 14, glassY, stW - 28, glassH);
                ctx.strokeRect(stX + 14, glassY, stW - 28, glassH);

                // Minimalist oak display tables with glowing iPhones inside the store
                const drawDisplayTable = (tx) => {
                    ctx.fillStyle = '#d97706';
                    ctx.fillRect(tx, groundY - 42, 84, 8);
                    ctx.fillStyle = '#92400e';
                    ctx.fillRect(tx + 8, groundY - 34, 5, 34);
                    ctx.fillRect(tx + 71, groundY - 34, 5, 34);
                    // Mini upright iPhones on display stands
                    for (let p = 0; p < 3; p++) {
                        ctx.fillStyle = '#0f172a';
                        ctx.fillRect(tx + 12 + p * 24, groundY - 56, 11, 15);
                        ctx.fillStyle = p === 1 ? '#facc15' : '#38bdf8';
                        ctx.fillRect(tx + 13.5 + p * 24, groundY - 54.5, 8, 12);
                    }
                };
                drawDisplayTable(stX + 28);
                drawDisplayTable(stX + stW - 112);

                // Center Glass Sliding Entrance Doors + Diagonal Glass Reflections
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 2.5;
                ctx.strokeRect(cw / 2 - 46, glassY + 12, 92, glassH - 12);
                ctx.beginPath();
                ctx.moveTo(cw / 2, glassY + 12);
                ctx.lineTo(cw / 2, groundY);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(stX + 34, glassY + 12);
                ctx.lineTo(stX + 18, glassY + 48);
                ctx.moveTo(stX + stW - 34, glassY + 14);
                ctx.lineTo(stX + stW - 56, glassY + 60);
                ctx.stroke();
                ctx.restore();

                // Blinding Golden Rays from Player's Flagship Phone
                const rx = cw / 2 + 25;
                const ry = groundY - 95;
                ctx.save();
                for (let i = 0; i < 12; i++) {
                    const ang = t * 1.5 + (i * Math.PI / 6);
                    ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.moveTo(rx, ry);
                    ctx.lineTo(rx + Math.cos(ang) * 160, ry + Math.sin(ang) * 160);
                    ctx.stroke();
                }
                ctx.restore();
                // Left side: Poor Canteen Tray (White Rice + Free Soup)
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(cw / 2 - 260, groundY - 95, 135, 80, 10);
                ctx.fill();
                ctx.stroke();
                ctx.font = '32px sans-serif';
                ctx.fillText('🍚 🥣', cw / 2 - 235, groundY - 50);
                ctx.fillStyle = '#dc2626';
                ctx.font = 'bold 14px sans-serif';
                ctx.fillText('Meal Card: RM12', cw / 2 - 248, groundY - 24);
                drawPropBubble(cw / 2 + 150, groundY - 150, '🤩', 1.1, '#fef08a', '#ca8a04');

            } else if (sceneType === 'smart_save') {
                drawSceneBanner('#dcfce7', '#bbf7d0');
                drawSkyscraperBackdrop('emerald');
                drawGround('#cbd5e1', '#16a34a');
                // Giant Golden Piggy Bank & Rising Interest Bars
                drawPropBubble(cw / 2 - 130, groundY - 110, '📱', 1.2, '#e0f2fe', '#0284c7');
                drawPropBubble(cw / 2 + 130, groundY - 110, '🐷', 1.4, '#fef08a', '#ca8a04');
                for (let i = 0; i < 4; i++) {
                    const bh = 35 + i * 25;
                    ctx.fillStyle = '#22c55e';
                    ctx.fillRect(cw / 2 + 190 + i * 28, groundY - bh, 20, bh);
                }
                ctx.fillStyle = '#15803d';
                ctx.font = 'bold 20px sans-serif';
                ctx.fillText('💰 Compounding +📈', cw / 2 + 175, groundY - 145);

            } else if (sceneType === 'frugal_sad') {
                drawSceneBanner('#1e293b', '#334155');
                drawGround('#475569', '#0f172a');

                // Row of Connected 2-Story Terrace Houses (Malaysian Link Houses) in Evening Sky
                const unitW = 136;
                const unitH = Math.min(158, Math.max(118, groundY - 95));
                const unitCount = Math.max(4, Math.ceil(cw / unitW) + 1);
                const rowStartX = (cw - unitCount * unitW) / 2;
                ctx.save();
                for (let u = 0; u < unitCount; u++) {
                    const ux = rowStartX + u * unitW;
                    const uy = groundY - unitH;

                    // Shared-wall 2-story terrace house body (warm pastel stucco tones)
                    ctx.fillStyle = u % 2 === 0 ? '#475569' : '#3f4f66';
                    ctx.strokeStyle = '#1e293b';
                    ctx.lineWidth = 2.5;
                    ctx.fillRect(ux, uy, unitW, unitH);
                    ctx.strokeRect(ux, uy, unitW, unitH);

                    // Continuous clay-tiled pitched roof over each terrace unit
                    ctx.fillStyle = '#7c2d12';
                    ctx.strokeStyle = '#451a03';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(ux - 4, uy + 2);
                    ctx.lineTo(ux + 18, uy - 36);
                    ctx.lineTo(ux + unitW - 18, uy - 36);
                    ctx.lineTo(ux + unitW + 4, uy + 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Upstairs windows & balcony railing
                    const isLitUp = (u % 3 !== 1);
                    ctx.fillStyle = isLitUp ? '#fde047' : '#1e293b';
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 2;
                    ctx.fillRect(ux + 18, uy + 18, 38, 32);
                    ctx.strokeRect(ux + 18, uy + 18, 38, 32);
                    ctx.fillStyle = (u % 2 === 0) ? '#fde68a' : '#1e293b';
                    ctx.fillRect(ux + 74, uy + 18, 42, 32);
                    ctx.strokeRect(ux + 74, uy + 18, 42, 32);

                    // Balcony railing bar
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(ux + 70, uy + 40, 50, 14);

                    // Ground-floor car porch awning
                    ctx.fillStyle = '#991b1b';
                    ctx.beginPath();
                    ctx.moveTo(ux + 4, uy + 72);
                    ctx.lineTo(ux + unitW - 4, uy + 72);
                    ctx.lineTo(ux + unitW, uy + 86);
                    ctx.lineTo(ux, uy + 86);
                    ctx.closePath();
                    ctx.fill();

                    // Front door & ground-floor window + front gate pillars
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(ux + 20, groundY - 58, 30, 58);
                    ctx.strokeStyle = '#0f172a';
                    ctx.strokeRect(ux + 20, groundY - 58, 30, 58);
                    ctx.fillStyle = (u % 2 === 1) ? '#fef08a' : '#1e293b';
                    ctx.fillRect(ux + 68, groundY - 54, 46, 30);
                    ctx.strokeRect(ux + 68, groundY - 54, 46, 30);

                    // Low terrace gate pillar separating neighbors
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillRect(ux - 4, groundY - 34, 8, 34);
                }

                // Warm evening streetlamp on left sidewalk
                const lampX = Math.max(46, cw / 2 - 260);
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(lampX, groundY);
                ctx.lineTo(lampX, groundY - 150);
                ctx.lineTo(lampX + 20, groundY - 150);
                ctx.stroke();
                const lampGlow = ctx.createRadialGradient(lampX + 20, groundY - 144, 4, lampX + 20, groundY - 144, 52);
                lampGlow.addColorStop(0, 'rgba(254, 240, 138, 0.72)');
                lampGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
                ctx.fillStyle = lampGlow;
                ctx.beginPath();
                ctx.arc(lampX + 20, groundY - 144, 52, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Distant Window with Party Lights (FOMO)
                ctx.fillStyle = '#fde047';
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.roundRect(cw / 2 + 140, groundY - 190, 150, 95, 10);
                ctx.fill();
                ctx.stroke();
                ctx.font = '28px sans-serif';
                ctx.fillText('🎉 🎶 🍻', cw / 2 + 160, groundY - 130);
                // Cracked Phone + Heavy Safe beside player
                drawPropBubble(cw / 2 - 110, groundY - 120, '📱⚡', 1.2, '#f1f5f9', '#64748b');
                drawPropBubble(cw / 2 - 190, groundY - 75, '🔒💰', 1.2, '#fef08a', '#ca8a04');

            } else if (sceneType === 'party_dance') {
                // Starry Night Camping & Livehouse Music Festival
                drawSceneBanner('#0f172a', '#1e1b4b');
                drawGround('#14532d', '#15803d');

                // Twinkling Stars & Glowing Crescent Moon
                for (let i = 0; i < 28; i++) {
                    const alpha = 0.55 + Math.sin(t * 3 + i * 1.7) * 0.4;
                    ctx.fillStyle = `rgba(254, 240, 138, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc((i * 89 + 25) % cw, 22 + (i * 31) % Math.max(85, groundY - 140), i % 3 === 0 ? 2.8 : 1.8, 0, Math.PI * 2);
                    ctx.fill();
                }
                const moonX = cw - 92;
                const moonY = 58;
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.arc(moonX, moonY, 24, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#14193c';
                ctx.beginPath();
                ctx.arc(moonX + 10, moonY - 6, 21, 0, Math.PI * 2);
                ctx.fill();

                // Background Pine Tree Silhouettes
                const drawPine = (px, h) => {
                    ctx.fillStyle = '#064e3b';
                    ctx.beginPath();
                    ctx.moveTo(px, groundY - h);
                    ctx.lineTo(px - h * 0.36, groundY - h * 0.42);
                    ctx.lineTo(px - h * 0.2, groundY - h * 0.42);
                    ctx.lineTo(px - h * 0.46, groundY);
                    ctx.lineTo(px + h * 0.46, groundY);
                    ctx.lineTo(px + h * 0.2, groundY - h * 0.42);
                    ctx.lineTo(px + h * 0.36, groundY - h * 0.42);
                    ctx.closePath();
                    ctx.fill();
                };
                drawPine(Math.max(55, cw * 0.08), 125);
                drawPine(Math.max(115, cw * 0.14), 95);
                drawPine(Math.min(cw - 75, cw * 0.88), 130);
                drawPine(Math.min(cw - 130, cw * 0.82), 92);

                // Detailed 3D A-Frame / Dome Camping Tent on Left
                const tx = cw / 2 - 225;
                const tw = 165;
                const th = 112;
                const ridgeX = tx + 52;
                const ridgeY = groundY - th;
                const backRidgeX = tx + tw - 28;
                const backRidgeY = groundY - th + 12;

                ctx.save();
                // Guy-lines & metal tent stakes pegged into grass
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(tx - 24, groundY);
                ctx.lineTo(tx + 12, groundY - th * 0.52);
                ctx.moveTo(tx + tw + 22, groundY);
                ctx.lineTo(tx + tw - 12, groundY - th * 0.48);
                ctx.stroke();
                ctx.fillStyle = '#94a3b8';
                ctx.fillRect(tx - 26, groundY - 7, 4, 9);
                ctx.fillRect(tx + tw + 20, groundY - 7, 4, 9);

                // 3D Shaded Side Canvas Wall (burnt terracotta orange)
                ctx.fillStyle = '#c2410c';
                ctx.strokeStyle = '#7c2d12';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(ridgeX, ridgeY);
                ctx.lineTo(backRidgeX, backRidgeY);
                ctx.lineTo(tx + tw, groundY);
                ctx.lineTo(tx + 104, groundY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Front Bright Orange Triangular Tent Face
                ctx.fillStyle = '#f97316';
                ctx.strokeStyle = '#7c2d12';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(tx, groundY);
                ctx.lineTo(ridgeX, ridgeY);
                ctx.lineTo(tx + 104, groundY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Waterproof Cream / Amber Rainfly Cap draped over top ridge
                ctx.fillStyle = '#fef3c7';
                ctx.strokeStyle = '#d97706';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(tx + 24, ridgeY + 38);
                ctx.quadraticCurveTo(ridgeX, ridgeY - 8, backRidgeX, backRidgeY);
                ctx.lineTo(backRidgeX + 18, backRidgeY + 34);
                ctx.quadraticCurveTo(tx + 115, ridgeY + 32, tx + 80, ridgeY + 38);
                ctx.quadraticCurveTo(ridgeX, ridgeY + 26, tx + 24, ridgeY + 38);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Open Zipped Doorway with Warm Glowing Lantern Interior
                const doorGrad = ctx.createRadialGradient(ridgeX, groundY - 34, 4, ridgeX, groundY - 26, 48);
                doorGrad.addColorStop(0, '#fef08a');
                doorGrad.addColorStop(0.55, '#d97706');
                doorGrad.addColorStop(1, '#451a03');
                ctx.fillStyle = doorGrad;
                ctx.beginPath();
                ctx.moveTo(tx + 26, groundY);
                ctx.lineTo(ridgeX, ridgeY + 34);
                ctx.lineTo(tx + 78, groundY);
                ctx.closePath();
                ctx.fill();

                // Hanging glowing lantern bulb inside doorway
                ctx.fillStyle = '#fef9c3';
                ctx.beginPath();
                ctx.arc(ridgeX, ridgeY + 52, 5.5, 0, Math.PI * 2);
                ctx.fill();

                // Rolled-back canvas door flaps & center pole
                ctx.fillStyle = '#fdba74';
                ctx.strokeStyle = '#9a3412';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(tx + 26, groundY);
                ctx.lineTo(ridgeX, ridgeY + 34);
                ctx.lineTo(tx + 18, groundY - 12);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(tx + 78, groundY);
                ctx.lineTo(ridgeX, ridgeY + 34);
                ctx.lineTo(tx + 86, groundY - 12);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();

                // Real Animated Campfire with Stone Ring, Crossed Logs & Flickering Flames
                const fx = cw / 2 - 102;
                const fireFlicker = Math.sin(t * 14) * 4;
                ctx.save();
                // Warm radial firelight glow
                const fireGlow = ctx.createRadialGradient(fx, groundY - 18, 6, fx, groundY - 18, 64);
                fireGlow.addColorStop(0, 'rgba(251, 146, 60, 0.42)');
                fireGlow.addColorStop(1, 'rgba(251, 146, 60, 0)');
                ctx.fillStyle = fireGlow;
                ctx.beginPath();
                ctx.arc(fx, groundY - 18, 64, 0, Math.PI * 2);
                ctx.fill();

                // Crossed wooden logs
                ctx.strokeStyle = '#78350f';
                ctx.lineWidth = 7;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(fx - 22, groundY - 4);
                ctx.lineTo(fx + 20, groundY - 14);
                ctx.moveTo(fx + 22, groundY - 4);
                ctx.lineTo(fx - 20, groundY - 14);
                ctx.stroke();

                // Outer red-orange flame
                ctx.fillStyle = '#ea580c';
                ctx.beginPath();
                ctx.moveTo(fx - 18, groundY - 10);
                ctx.quadraticCurveTo(fx - 20, groundY - 34, fx + fireFlicker * 0.5, groundY - 54 - fireFlicker);
                ctx.quadraticCurveTo(fx + 20, groundY - 34, fx + 18, groundY - 10);
                ctx.closePath();
                ctx.fill();

                // Mid golden flame
                ctx.fillStyle = '#facc15';
                ctx.beginPath();
                ctx.moveTo(fx - 11, groundY - 10);
                ctx.quadraticCurveTo(fx - 12, groundY - 26, fx - fireFlicker * 0.4, groundY - 40 + fireFlicker * 0.5);
                ctx.quadraticCurveTo(fx + 12, groundY - 26, fx + 11, groundY - 10);
                ctx.closePath();
                ctx.fill();

                // Inner white-hot core
                ctx.fillStyle = '#fef9c3';
                ctx.beginPath();
                ctx.arc(fx, groundY - 16, 6, 0, Math.PI * 2);
                ctx.fill();

                // River stones ring at base
                [-20, -10, 0, 10, 20].forEach((sx, idx) => {
                    ctx.fillStyle = idx % 2 === 0 ? '#64748b' : '#475569';
                    ctx.beginPath();
                    ctx.ellipse(fx + sx, groundY - 2, 6.5, 4, 0, 0, Math.PI * 2);
                    ctx.fill();
                });

                // Rising glowing embers
                for (let e = 0; e < 6; e++) {
                    const ep = (t * 0.9 + e * 0.21) % 1;
                    const ex = fx + Math.sin(t * 4 + e * 2) * 14;
                    const ey = groundY - 24 - ep * 75;
                    ctx.fillStyle = `rgba(253, 224, 71, ${1 - ep})`;
                    ctx.beginPath();
                    ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();

                drawPropBubble(cw / 2 + 25, groundY - 148, '🎸', 1.2, '#fef3c7', '#f59e0b');
                drawPropBubble(cw / 2 + 145, groundY - 158, '🎶', 1.1, '#fce7f3', '#ec4899');

            // --- AGE 23 OPTIONS ---
            } else if (sceneType === 'cocktail_party' || sceneType === 'workplace') {
                if (sceneType === 'cocktail_party') {
                    drawSceneBanner('#1e1b4b', '#581c87');
                    drawGround('#3b0764', '#a855f7');
                    // Neon Bar Counter & Cocktail / Sushi
                    ctx.fillStyle = '#ec4899';
                    ctx.font = 'bold 24px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('🍸 NEON ROOFTOP LOUNGE 🍣', cw / 2, 55);
                    ctx.textAlign = 'left';
                    drawPropBubble(cw / 2 - 110, groundY - 125, '🍷', 1.15, '#fdf2f8', '#ec4899');
                    drawPropBubble(cw / 2 - 180, groundY - 95, '🍣', 1.1, '#fdf2f8', '#ec4899');
                    // Flashing Red Credit Card Bills on Right
                    drawPropBubble(cw / 2 + 165, groundY - 135, '💳💸', 1.3, '#fee2e2', '#dc2626');
                } else {
                    // Bustling Open-Plan Modern Office with Coworkers Working Together
                    drawSceneBanner('#f1f5f9', '#e2e8f0');
                    drawGround('#cbd5e1', '#94a3b8');

                    // Panoramic Office Window (City Skyline View)
                    const winW = Math.min(460, cw - 120);
                    const winH = Math.min(130, Math.max(82, groundY - 145));
                    const winX = cw / 2 - winW / 2;
                    const winY = Math.max(24, groundY - winH - 125);
                    ctx.fillStyle = '#bae6fd';
                    ctx.strokeStyle = '#64748b';
                    ctx.lineWidth = 4;
                    ctx.fillRect(winX, winY, winW, winH);
                    ctx.strokeRect(winX, winY, winW, winH);
                    // Distant office skyline inside window
                    ctx.fillStyle = '#93c5fd';
                    for (let i = 0; i < 8; i++) {
                        const bh = 30 + ((i * 23) % 48);
                        ctx.fillRect(winX + 12 + i * (winW / 8.5), winY + winH - bh, 34, bh);
                    }
                    // Window mullions
                    ctx.strokeStyle = '#64748b';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(winX + winW / 3, winY);
                    ctx.lineTo(winX + winW / 3, winY + winH);
                    ctx.moveTo(winX + (winW * 2) / 3, winY);
                    ctx.lineTo(winX + (winW * 2) / 3, winY + winH);
                    ctx.stroke();

                    // Team Whiteboard with Charts on Left Wall
                    const wbX = Math.max(26, cw / 2 - 330);
                    const wbY = Math.max(52, groundY - 210);
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#475569';
                    ctx.lineWidth = 3;
                    ctx.fillRect(wbX, wbY, 108, 66);
                    ctx.strokeRect(wbX, wbY, 108, 66);
                    ctx.strokeStyle = '#22c55e';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(wbX + 12, wbY + 50);
                    ctx.lineTo(wbX + 38, wbY + 36);
                    ctx.lineTo(wbX + 64, wbY + 42);
                    ctx.lineTo(wbX + 94, wbY + 18);
                    ctx.stroke();
                    // Sticky notes on whiteboard
                    ctx.fillStyle = '#fde047';
                    ctx.fillRect(wbX + 10, wbY + 10, 14, 14);
                    ctx.fillStyle = '#f472b6';
                    ctx.fillRect(wbX + 28, wbY + 10, 14, 14);

                    // Office Potted Plant on Far Left
                    const plantX = Math.max(36, cw / 2 - 315);
                    ctx.fillStyle = '#b45309';
                    ctx.fillRect(plantX - 14, groundY - 32, 28, 32);
                    ctx.fillStyle = '#16a34a';
                    ctx.beginPath();
                    ctx.arc(plantX - 10, groundY - 46, 14, 0, Math.PI * 2);
                    ctx.arc(plantX + 10, groundY - 48, 14, 0, Math.PI * 2);
                    ctx.arc(plantX, groundY - 62, 15, 0, Math.PI * 2);
                    ctx.fill();

                    // Helper: Seated Animated Coworker Typing at Office Desk
                    const drawCoworkerDesk = (dx, accentColor, hasPonytail, phase) => {
                        const typeBounce = Math.sin(t * 14 + phase) * 3;
                        const headBob = Math.sin(t * 2.5 + phase) * 2;
                        ctx.save();
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';

                        // Office swivel chair back & base
                        ctx.fillStyle = '#334155';
                        ctx.beginPath();
                        ctx.roundRect(dx - 22, groundY - 88, 44, 38, 6);
                        ctx.fill();
                        ctx.strokeStyle = '#475569';
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.moveTo(dx, groundY - 50);
                        ctx.lineTo(dx, groundY - 4);
                        ctx.moveTo(dx - 18, groundY - 4);
                        ctx.lineTo(dx + 18, groundY - 4);
                        ctx.stroke();

                        // Coworker torso & shirt/tie accent
                        ctx.strokeStyle = '#0f172a';
                        ctx.lineWidth = 4.5;
                        ctx.beginPath();
                        ctx.moveTo(dx, groundY - 52);
                        ctx.lineTo(dx, groundY - 96 + headBob);
                        ctx.stroke();
                        ctx.fillStyle = accentColor;
                        ctx.beginPath();
                        ctx.moveTo(dx - 5, groundY - 92 + headBob);
                        ctx.lineTo(dx + 5, groundY - 92 + headBob);
                        ctx.lineTo(dx + 3, groundY - 64);
                        ctx.lineTo(dx - 3, groundY - 64);
                        ctx.closePath();
                        ctx.fill();

                        // Typing arms reaching toward laptop
                        ctx.strokeStyle = '#0f172a';
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.moveTo(dx, groundY - 86 + headBob);
                        ctx.lineTo(dx - 16, groundY - 62 + typeBounce);
                        ctx.moveTo(dx, groundY - 86 + headBob);
                        ctx.lineTo(dx + 16, groundY - 62 - typeBounce);
                        ctx.stroke();

                        // Head (with optional ponytail & glasses)
                        const hy = groundY - 114 + headBob;
                        if (hasPonytail) {
                            ctx.fillStyle = '#451a03';
                            ctx.beginPath();
                            ctx.arc(dx + 18, hy - 4, 10, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = '#0f172a';
                        ctx.lineWidth = 3.2;
                        ctx.beginPath();
                        ctx.arc(dx, hy, 17, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                        ctx.fillStyle = '#0f172a';
                        ctx.beginPath();
                        ctx.arc(dx - 5, hy - 2, 2.2, 0, Math.PI * 2);
                        ctx.arc(dx + 5, hy - 2, 2.2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = '#0f172a';
                        ctx.lineWidth = 1.8;
                        ctx.beginPath();
                        ctx.arc(dx, hy + 3, 5.5, 0.2, Math.PI - 0.2);
                        ctx.stroke();

                        // Office Desk + Legs
                        ctx.fillStyle = '#94a3b8';
                        ctx.fillRect(dx - 58, groundY - 54, 116, 10);
                        ctx.fillStyle = '#64748b';
                        ctx.fillRect(dx - 52, groundY - 44, 6, 44);
                        ctx.fillRect(dx + 46, groundY - 44, 6, 44);

                        // Glowing Laptop / Monitor on Coworker's Desk
                        ctx.fillStyle = '#1e293b';
                        ctx.beginPath();
                        ctx.roundRect(dx - 24, groundY - 88, 48, 34, 4);
                        ctx.fill();
                        ctx.fillStyle = '#38bdf8';
                        ctx.fillRect(dx - 20, groundY - 84, 40, 24);
                        // Coffee mug on desk
                        ctx.fillStyle = '#f97316';
                        ctx.fillRect(dx + 32, groundY - 66, 11, 12);
                        ctx.restore();
                    };

                    // 2 Seated Coworkers on Left & Right of Player
                    drawCoworkerDesk(cw / 2 - 205, '#2563eb', false, 0.4);
                    drawCoworkerDesk(cw / 2 + 195, '#ec4899', true, 2.1);

                    // 3rd Standing Coworker Collaborating on Far Right with Clipboard
                    const c3x = Math.min(cw - 65, cw / 2 + 305);
                    const c3bob = Math.sin(t * 3 + 1.2) * 2;
                    ctx.save();
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 4;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(c3x, groundY - 50 + c3bob);
                    ctx.lineTo(c3x - 11, groundY);
                    ctx.moveTo(c3x, groundY - 50 + c3bob);
                    ctx.lineTo(c3x + 11, groundY);
                    ctx.moveTo(c3x, groundY - 50 + c3bob);
                    ctx.lineTo(c3x, groundY - 94 + c3bob);
                    ctx.moveTo(c3x, groundY - 86 + c3bob);
                    ctx.lineTo(c3x - 22, groundY - 70 + c3bob);
                    ctx.moveTo(c3x, groundY - 86 + c3bob);
                    ctx.lineTo(c3x + 14, groundY - 64 + c3bob);
                    ctx.stroke();
                    // Green lanyard/tie + clipboard
                    ctx.fillStyle = '#16a34a';
                    ctx.fillRect(c3x - 3, groundY - 90 + c3bob, 6, 22);
                    ctx.fillStyle = '#92400e';
                    ctx.fillRect(c3x - 34, groundY - 82 + c3bob, 16, 22);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(c3x - 32, groundY - 79 + c3bob, 12, 16);
                    // Head
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 3.2;
                    ctx.beginPath();
                    ctx.arc(c3x, groundY - 112 + c3bob, 17, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(c3x - 5, groundY - 114 + c3bob, 2.2, 0, Math.PI * 2);
                    ctx.arc(c3x + 5, groundY - 114 + c3bob, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();

                    // Player's Center Workstation Desk & Monitor
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillRect(cw / 2 - 86, groundY - 52, 172, 12);
                    ctx.fillStyle = '#64748b';
                    ctx.fillRect(cw / 2 - 76, groundY - 40, 8, 40);
                    ctx.fillRect(cw / 2 + 68, groundY - 40, 8, 40);
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.roundRect(cw / 2 - 42, groundY - 102, 74, 48, 5);
                    ctx.fill();
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(cw / 2 - 37, groundY - 97, 64, 38);
                    ctx.fillStyle = '#22c55e';
                    ctx.fillRect(cw / 2 - 30, groundY - 76, 12, 14);
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(cw / 2 - 14, groundY - 84, 12, 22);
                    ctx.fillStyle = '#facc15';
                    ctx.fillRect(cw / 2 + 2, groundY - 90, 12, 28);
                    drawPropBubble(cw / 2 + 108, groundY - 150, '💼', 1.05);
                }

            } else if (sceneType === 'satisfied_nod') {
                drawSceneBanner('#ecfdf5', '#d1fae5');
                drawSkyscraperBackdrop('emerald');
                drawGround('#cbd5e1', '#10b981');
                // Rising Compound Snowball Curve
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(cw / 2 - 220, groundY - 20);
                ctx.quadraticCurveTo(cw / 2 - 80, groundY - 40, cw / 2 + 200, groundY - 180);
                ctx.stroke();
                drawPropBubble(cw / 2 - 140, groundY - 120, '📅 25th', 1.1, '#ffffff', '#059669');
                drawPropBubble(cw / 2 + 150, groundY - 155, '📈💰', 1.3, '#fef08a', '#16a34a');

            } else if (sceneType === 'iron_piggybank') {
                drawSceneBanner('#e0f2fe', '#bae6fd');
                drawSkyscraperBackdrop('blue');
                drawGround('#cbd5e1', '#0284c7');
                // Giant Steel Vault Safe (6 Months Emergency Fund)
                ctx.fillStyle = '#334155';
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.roundRect(cw / 2 + 80, groundY - 140, 140, 140, 14);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(cw / 2 + 150, groundY - 70, 28, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#38bdf8';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🛡️ 6-Mo Emergency Fund', cw / 2 + 150, groundY - 152);
                ctx.textAlign = 'left';
                // Steaming bowl of noodles on Left
                drawPropBubble(cw / 2 - 120, groundY - 105, '🍜', 1.2, '#fffbeb', '#d97706');

            } else if (sceneType === 'shield_protect' || sceneType === 'guardian_shield') {
                drawSceneBanner('#dbeafe', '#bfdbfe');
                drawSkyscraperBackdrop('blue');
                drawGround('#cbd5e1', '#2563eb');
                // Giant Glowing Protective Dome over Characters
                const pulse = 1 + Math.sin(t * 5) * 0.04;
                ctx.save();
                ctx.strokeStyle = '#2563eb';
                ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.arc(cw / 2, groundY, 195 * pulse, Math.PI, 0);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
                drawPropBubble(cw / 2, groundY - 210, '🛡️✨', 1.35, '#fef08a', '#2563eb');

            // --- AGE 25 OPTIONS (CARS) ---
            } else if (sceneType === 'sports_car_flex' || sceneType === 'car') {
                drawSceneBanner('#ffe4e6', '#fecdd3');
                drawGround('#1e293b', '#0f172a');

                // Moving highway dashed road markings
                ctx.strokeStyle = 'rgba(248, 250, 252, 0.72)';
                ctx.lineWidth = 4;
                const roadOffset = (t * 220) % 90;
                for (let rx = -roadOffset; rx < cw + 90; rx += 90) {
                    ctx.beginPath();
                    ctx.moveTo(rx, groundY + 18);
                    ctx.lineTo(rx + 42, groundY + 18);
                    ctx.stroke();
                }

                const cx = cw / 2;
                const vibe = Math.sin(t * 18) * 1.1;
                const baseY = groundY + vibe;

                // Soft under-car ground shadow
                ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
                ctx.beginPath();
                ctx.ellipse(cx + 8, groundY + 2, 224, 10, 0, 0, Math.PI * 2);
                ctx.fill();

                // Realistic Multi-Layer Animated Exhaust Smoke Plumes & Turbo Jet
                const exX = cx - 208;
                const exY = baseY - 22;
                ctx.save();
                for (let i = 0; i < 12; i++) {
                    const phase = (t * 1.65 + i / 12) % 1;
                    const puffX = exX - 18 - phase * 165;
                    const puffY = exY - phase * 24 + Math.sin(t * 6 + i * 1.3) * (4 + phase * 10);
                    const puffR = 8 + phase * 26;
                    const alpha = Math.max(0, (1 - phase) * 0.52);
                    const smokeGrad = ctx.createRadialGradient(puffX, puffY, puffR * 0.15, puffX, puffY, puffR);
                    smokeGrad.addColorStop(0, `rgba(226, 232, 240, ${alpha})`);
                    smokeGrad.addColorStop(0.55, `rgba(148, 163, 184, ${alpha * 0.75})`);
                    smokeGrad.addColorStop(1, 'rgba(100, 116, 139, 0)');
                    ctx.fillStyle = smokeGrad;
                    ctx.beginPath();
                    ctx.arc(puffX, puffY, puffR, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Metallic twin exhaust tailpipe
                ctx.fillStyle = '#475569';
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(exX - 10, exY - 6, 18, 12, 3);
                ctx.fill();
                ctx.stroke();

                // Realistic flickering turbo flame jet + trailing sparks
                const jetLen = 28 + Math.sin(t * 34) * 9 + Math.cos(t * 51) * 5;
                const outerFlame = ctx.createLinearGradient(exX - 8, exY, exX - 8 - jetLen, exY);
                outerFlame.addColorStop(0, 'rgba(56, 189, 248, 0.92)');
                outerFlame.addColorStop(0.35, 'rgba(251, 146, 60, 0.85)');
                outerFlame.addColorStop(1, 'rgba(239, 68, 68, 0)');
                ctx.fillStyle = outerFlame;
                ctx.beginPath();
                ctx.moveTo(exX - 8, exY - 6);
                ctx.quadraticCurveTo(exX - 10 - jetLen * 0.6, exY - 9, exX - 10 - jetLen, exY);
                ctx.quadraticCurveTo(exX - 10 - jetLen * 0.6, exY + 9, exX - 8, exY + 6);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = 'rgba(254, 249, 195, 0.95)';
                ctx.beginPath();
                ctx.moveTo(exX - 8, exY - 3);
                ctx.lineTo(exX - 10 - jetLen * 0.55, exY);
                ctx.lineTo(exX - 8, exY + 3);
                ctx.closePath();
                ctx.fill();

                for (let s = 0; s < 5; s++) {
                    const sp = (t * 2.8 + s * 0.23) % 1;
                    const sx = exX - 16 - sp * 95;
                    const sy = exY + Math.sin(s * 7 + t * 18) * (4 + sp * 10);
                    ctx.fillStyle = `rgba(253, 224, 71, ${1 - sp})`;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();

                // Latest Tesla Sleek Fastback Silhouette (Back Interior & Panoramic Roof Arch)
                ctx.save();
                // Tinted panoramic glass roof & cabin back
                const glassGrad = ctx.createLinearGradient(cx - 80, baseY - 118, cx + 60, baseY - 64);
                glassGrad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
                glassGrad.addColorStop(1, 'rgba(51, 65, 85, 0.72)');
                ctx.fillStyle = glassGrad;
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(cx - 148, baseY - 64);
                ctx.quadraticCurveTo(cx - 65, baseY - 122, cx + 22, baseY - 118);
                ctx.quadraticCurveTo(cx + 88, baseY - 114, cx + 132, baseY - 62);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Glass reflection highlight streak
                ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(cx - 60, baseY - 106);
                ctx.quadraticCurveTo(cx + 10, baseY - 110, cx + 82, baseY - 82);
                ctx.stroke();

                // Sleek Tesla Ultra Red Metallic Body
                const bodyGrad = ctx.createLinearGradient(cx, baseY - 78, cx, baseY - 12);
                bodyGrad.addColorStop(0, '#f43f5e');
                bodyGrad.addColorStop(0.45, '#dc2626');
                bodyGrad.addColorStop(1, '#991b1b');
                ctx.fillStyle = bodyGrad;
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 3.2;
                ctx.beginPath();
                ctx.moveTo(cx - 204, baseY - 22);
                ctx.quadraticCurveTo(cx - 210, baseY - 52, cx - 196, baseY - 68);
                // Sporty rear lip spoiler
                ctx.lineTo(cx - 178, baseY - 73);
                ctx.lineTo(cx - 145, baseY - 66);
                // Beltline across cabin to sleek low Highland hood
                ctx.lineTo(cx + 128, baseY - 63);
                ctx.quadraticCurveTo(cx + 195, baseY - 58, cx + 226, baseY - 38);
                ctx.quadraticCurveTo(cx + 234, baseY - 24, cx + 222, baseY - 14);
                ctx.lineTo(cx - 196, baseY - 14);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Lower carbon-fiber diffuser & side skirt
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(cx - 198, baseY - 20, 418, 7);

                // Forward LED DRL Headlight Beam + Razor-Slim Highland Headlight
                const beamGrad = ctx.createLinearGradient(cx + 224, baseY - 38, cx + 335, baseY - 24);
                beamGrad.addColorStop(0, 'rgba(224, 242, 254, 0.58)');
                beamGrad.addColorStop(1, 'rgba(224, 242, 254, 0)');
                ctx.fillStyle = beamGrad;
                ctx.beginPath();
                ctx.moveTo(cx + 222, baseY - 42);
                ctx.lineTo(cx + 340, baseY - 58);
                ctx.lineTo(cx + 340, baseY - 10);
                ctx.lineTo(cx + 222, baseY - 30);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#f8fafc';
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(cx + 188, baseY - 46);
                ctx.quadraticCurveTo(cx + 210, baseY - 46, cx + 224, baseY - 38);
                ctx.lineTo(cx + 216, baseY - 33);
                ctx.quadraticCurveTo(cx + 200, baseY - 39, cx + 186, baseY - 41);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Crimson C-Shaped Tesla LED Taillight Bar
                ctx.fillStyle = '#ff2a55';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.roundRect(cx - 204, baseY - 56, 26, 9, 4);
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.restore();
                drawPropBubble(cx + 225, groundY - 150, '⚡💸', 1.2, '#fee2e2', '#dc2626');

            } else if (sceneType === 'sedan_drive') {
                // Warm Family Sedan in Rainy Night
                drawSceneBanner('#1e293b', '#334155');
                drawGround('#0f172a', '#475569');
                // Raindrops outside
                ctx.strokeStyle = '#60a5fa';
                ctx.lineWidth = 1.5;
                for (let i = 0; i < 24; i++) {
                    const rx = (i * 60 + t * 80) % cw;
                    const ry = (i * 37 + t * 220) % (groundY - 40);
                    ctx.beginPath();
                    ctx.moveTo(rx, ry);
                    ctx.lineTo(rx - 6, ry + 16);
                    ctx.stroke();
                }
                // Warm Cozy Blue Sedan with Headlight Beam
                const cx = cw / 2;
                ctx.fillStyle = 'rgba(253, 224, 71, 0.28)';
                ctx.beginPath();
                ctx.moveTo(cx + 160, groundY - 42);
                ctx.lineTo(cx + 380, groundY - 95);
                ctx.lineTo(cx + 380, groundY);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#0284c7';
                ctx.strokeStyle = '#f8fafc';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.roundRect(cx - 145, groundY - 76, 295, 62, 18);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.arc(cx - 85, groundY - 12, 22, 0, Math.PI * 2);
                ctx.arc(cx + 95, groundY - 12, 22, 0, Math.PI * 2);
                ctx.fill();
                drawPropBubble(cx - 160, groundY - 145, '🎵🛡️', 1.15, '#fef9c3', '#0284c7');

            } else if (sceneType === 'clunker_rattle') {
                drawSceneBanner('#fef9c3', '#e2e8f0');
                drawGround('#475569', '#1e293b');

                // Subtle road dashed markings
                ctx.strokeStyle = 'rgba(248, 250, 252, 0.55)';
                ctx.lineWidth = 3.5;
                for (let rx = 20; rx < cw; rx += 88) {
                    ctx.beginPath();
                    ctx.moveTo(rx, groundY + 16);
                    ctx.lineTo(rx + 40, groundY + 16);
                    ctx.stroke();
                }

                // Realistic Malaysian Perodua Myvi (Metallic Green 5-Door Hatchback)
                const shakeY = Math.sin(t * 28) * 2.2;
                const cx = cw / 2 - 42;
                const by = groundY + shakeY;

                ctx.save();
                // Ground shadow
                ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
                ctx.beginPath();
                ctx.ellipse(cx - 8, groundY + 2, 148, 8, 0, 0, Math.PI * 2);
                ctx.fill();

                // Realistic old-car puffing exhaust smoke behind rear bumper
                const exX = cx - 150;
                const exY = by - 20;
                for (let i = 0; i < 8; i++) {
                    const ph = (t * 1.3 + i / 8) % 1;
                    const px = exX - 10 - ph * 105;
                    const py = exY - ph * 22 + Math.sin(t * 5 + i) * 5;
                    const pr = 6 + ph * 18;
                    const a = Math.max(0, (1 - ph) * 0.48);
                    ctx.fillStyle = `rgba(148, 163, 184, ${a})`;
                    ctx.beginPath();
                    ctx.arc(px, py, pr, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Exhaust tailpipe
                ctx.fillStyle = '#475569';
                ctx.fillRect(exX - 8, exY - 4, 14, 7);

                // Myvi Iconic Compact Hatchback Body (Metallic Lime/Emerald Green)
                const myviGrad = ctx.createLinearGradient(cx, by - 118, cx, by - 16);
                myviGrad.addColorStop(0, '#84cc16');
                myviGrad.addColorStop(0.5, '#65a30d');
                myviGrad.addColorStop(1, '#3f6212');
                ctx.fillStyle = myviGrad;
                ctx.strokeStyle = '#1a2e05';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(cx - 144, by - 18);
                // Steep hatchback rear hatch & sporty roof spoiler
                ctx.lineTo(cx - 148, by - 64);
                ctx.quadraticCurveTo(cx - 144, by - 104, cx - 122, by - 116);
                ctx.lineTo(cx - 134, by - 120); // Rear roof spoiler lip
                ctx.lineTo(cx - 116, by - 118);
                // Tall Myvi roof & angled windshield into compact hood
                ctx.lineTo(cx + 12, by - 116);
                ctx.quadraticCurveTo(cx + 48, by - 108, cx + 76, by - 74);
                ctx.quadraticCurveTo(cx + 116, by - 68, cx + 134, by - 50);
                ctx.quadraticCurveTo(cx + 142, by - 32, cx + 134, by - 18);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Glossy side beltline highlight
                ctx.strokeStyle = 'rgba(236, 252, 203, 0.55)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(cx - 126, by - 66);
                ctx.lineTo(cx + 116, by - 56);
                ctx.stroke();

                // Tinted Hatchback Side Windows (Front + Rear + Quarter Glass) with Black B-Pillar
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx - 114, by - 72);
                ctx.lineTo(cx - 106, by - 108);
                ctx.lineTo(cx + 10, by - 107);
                ctx.lineTo(cx + 62, by - 72);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Window pillars (B & C pillar) + glass reflection
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(cx - 24, by - 108);
                ctx.lineTo(cx - 28, by - 72);
                ctx.moveTo(cx - 86, by - 108);
                ctx.lineTo(cx - 94, by - 72);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(cx - 16, by - 100);
                ctx.lineTo(cx + 22, by - 78);
                ctx.stroke();

                // Door seam lines, handles & side mirror
                ctx.strokeStyle = 'rgba(26, 46, 5, 0.55)';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(cx - 28, by - 72);
                ctx.lineTo(cx - 32, by - 22);
                ctx.stroke();
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(cx - 12, by - 62, 16, 4);
                ctx.fillRect(cx - 72, by - 64, 15, 4);
                ctx.fillStyle = '#65a30d';
                ctx.strokeStyle = '#1a2e05';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.ellipse(cx + 52, by - 74, 9, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Signature Angular Myvi Headlight, Front Grille & Vertical LED Taillight
                ctx.fillStyle = '#fef9c3';
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(cx + 102, by - 58);
                ctx.lineTo(cx + 132, by - 48);
                ctx.lineTo(cx + 124, by - 38);
                ctx.lineTo(cx + 98, by - 46);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Front black lower grille
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(cx + 114, by - 32, 20, 10);

                // Vertical Myvi Rear Taillight Cluster
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(cx - 146, by - 78, 12, 30);
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(cx - 145, by - 62, 10, 6);

                // Malaysian Black-and-White "MYVI" Badge Plate
                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.roundRect(cx - 98, by - 48, 52, 17, 3);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = '900 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('MYVI', cx - 72, by - 36);

                // Perodua Metallic Side Accent Badge
                ctx.fillStyle = '#ecfccb';
                ctx.font = 'bold 8px sans-serif';
                ctx.fillText('PERODUA', cx + 42, by - 36);
                ctx.textAlign = 'left';

                // Realistic 5-Spoke Alloy Wheels with Wheel Arches
                const drawMyviWheel = (wx, wy) => {
                    ctx.save();
                    ctx.translate(wx, wy);
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(0, 0, 23, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#e2e8f0';
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, 15, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.rotate(t * 7);
                    ctx.strokeStyle = '#475569';
                    ctx.lineWidth = 2.5;
                    for (let k = 0; k < 5; k++) {
                        const a = (k * Math.PI * 2) / 5;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
                        ctx.stroke();
                    }
                    ctx.fillStyle = '#1e293b';
                    ctx.beginPath();
                    ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                };
                drawMyviWheel(cx - 96, groundY - 14);
                drawMyviWheel(cx + 82, groundY - 14);
                ctx.restore();

                drawPropBubble(cw / 2 + 175, groundY - 130, '💵💰', 1.3, '#dcfce7', '#16a34a');

            } else if (sceneType === 'bus_hanging') {
                drawSceneBanner('#e2e8f0', '#cbd5e1');
                drawGround('#64748b', '#334155');
                // Subway Carriage Interior Frame & Hanging Straps
                const subX = cw / 2 - 160;
                ctx.fillStyle = '#f8fafc';
                ctx.strokeStyle = '#0284c7';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.roundRect(subX, groundY - 185, 320, 175, 14);
                ctx.fill();
                ctx.stroke();
                // Hanging hand straps
                for (let i = 0; i < 4; i++) {
                    const sx = subX + 55 + i * 65;
                    ctx.strokeStyle = '#475569';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(sx, groundY - 185);
                    ctx.lineTo(sx, groundY - 145);
                    ctx.stroke();
                    ctx.strokeStyle = '#f59e0b';
                    ctx.beginPath();
                    ctx.arc(sx, groundY - 138, 7, 0, Math.PI * 2);
                    ctx.stroke();
                }
                drawPropBubble(cw / 2 + 230, groundY - 130, '🏦💰', 1.3, '#dcfce7', '#16a34a');

            // --- AGE 28 OPTIONS (WEDDING) ---
            } else if (sceneType === 'wedding_extravagant' || sceneType === 'wedding_altar') {
                drawSceneBanner('#fff1f2', '#fce7f3');
                drawGround('#fdf2f8', '#db2777');

                const gx = cw / 2;
                ctx.save();

                // Grand Wedding Cathedral / Palace Hall Interior Walls & Vaulted Arches
                const hallW = Math.min(720, cw - 30);
                const hallLeft = gx - hallW / 2;
                const hallH = Math.min(280, Math.max(195, groundY - 22));
                const hallTop = groundY - hallH;

                ctx.fillStyle = '#fff5f7';
                ctx.strokeStyle = '#f9a8d4';
                ctx.lineWidth = 2.5;
                ctx.fillRect(hallLeft, hallTop, hallW, hallH);
                ctx.strokeRect(hallLeft, hallTop, hallW, hallH);

                // Ornate Gold Upper Frieze & Draped Satin Garlands
                ctx.fillStyle = '#fef3c7';
                ctx.fillRect(hallLeft, hallTop, hallW, 18);
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(hallLeft, hallTop + 18);
                ctx.lineTo(hallLeft + hallW, hallTop + 18);
                ctx.stroke();

                // Soaring Stained-Glass Cathedral Arch Windows on Left & Right
                const drawStainedWindow = (wx) => {
                    const wy = hallTop + 34;
                    const ww = 66;
                    const wh = Math.min(135, hallH - 72);
                    const winGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
                    winGrad.addColorStop(0, '#fde68a');
                    winGrad.addColorStop(0.45, '#fbcfe8');
                    winGrad.addColorStop(1, '#bae6fd');
                    ctx.fillStyle = winGrad;
                    ctx.strokeStyle = '#d97706';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0);
                    ctx.lineTo(wx + ww, wy + wh);
                    ctx.lineTo(wx, wy + wh);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    // Rose-window mullions
                    ctx.strokeStyle = 'rgba(217, 119, 6, 0.55)';
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.moveTo(wx + ww / 2, wy);
                    ctx.lineTo(wx + ww / 2, wy + wh);
                    ctx.moveTo(wx, wy + wh * 0.55);
                    ctx.lineTo(wx + ww, wy + wh * 0.55);
                    ctx.stroke();
                };
                drawStainedWindow(hallLeft + 38);
                drawStainedWindow(hallLeft + 132);
                drawStainedWindow(hallLeft + hallW - 198);
                drawStainedWindow(hallLeft + hallW - 104);

                // 6 Tall Fluted Ivory Marble Columns with Gold Capitals & Bases
                const colOffsets = [-hallW * 0.44, -hallW * 0.27, -hallW * 0.14, hallW * 0.14, hallW * 0.27, hallW * 0.44];
                colOffsets.forEach((ox) => {
                    const cxCol = gx + ox;
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 2;
                    ctx.fillRect(cxCol - 11, hallTop + 20, 22, hallH - 20);
                    ctx.strokeRect(cxCol - 11, hallTop + 20, 22, hallH - 20);
                    // Gold capital & base trim
                    ctx.fillStyle = '#f59e0b';
                    ctx.fillRect(cxCol - 15, hallTop + 18, 30, 8);
                    ctx.fillRect(cxCol - 14, groundY - 8, 28, 8);
                });

                // Draped Blush Floral Swags along Top Frieze
                ctx.strokeStyle = '#f472b6';
                ctx.lineWidth = 4;
                for (let s = 0; s < 5; s++) {
                    const sx1 = hallLeft + (hallW / 5) * s;
                    const sx2 = hallLeft + (hallW / 5) * (s + 1);
                    ctx.beginPath();
                    ctx.moveTo(sx1, hallTop + 20);
                    ctx.quadraticCurveTo((sx1 + sx2) / 2, hallTop + 44, sx2, hallTop + 20);
                    ctx.stroke();
                }

                // Grand Sparkling Crystal Chandelier Hanging Center Ceiling
                const chY = hallTop + 44;
                ctx.strokeStyle = '#d97706';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(gx, hallTop);
                ctx.lineTo(gx, chY);
                ctx.stroke();
                const chGlow = ctx.createRadialGradient(gx, chY + 10, 6, gx, chY + 10, 72);
                chGlow.addColorStop(0, 'rgba(254, 240, 138, 0.72)');
                chGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
                ctx.fillStyle = chGlow;
                ctx.beginPath();
                ctx.arc(gx, chY + 10, 72, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(gx - 38, chY + 8);
                ctx.quadraticCurveTo(gx, chY + 26, gx + 38, chY + 8);
                ctx.moveTo(gx - 24, chY + 2);
                ctx.quadraticCurveTo(gx, chY + 16, gx + 24, chY + 2);
                ctx.stroke();
                [-36, -18, 0, 18, 36].forEach((ox, idx) => {
                    ctx.fillStyle = Math.sin(t * 5 + idx) > -0.3 ? '#fef9c3' : '#fde047';
                    ctx.beginPath();
                    ctx.arc(gx + ox, chY + 4 + Math.abs(ox) * 0.1, 4, 0, Math.PI * 2);
                    ctx.fill();
                });

                // Red Carpet Wedding Aisle & Scattered Rose Petals
                ctx.fillStyle = '#e11d48';
                ctx.beginPath();
                ctx.moveTo(gx - 78, groundY);
                ctx.lineTo(gx + 78, groundY);
                ctx.lineTo(gx + 130, ch);
                ctx.lineTo(gx - 130, ch);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(gx - 78, groundY);
                ctx.lineTo(gx - 130, ch);
                ctx.moveTo(gx + 78, groundY);
                ctx.lineTo(gx + 130, ch);
                ctx.stroke();

                // Soft Floating Rose Petals
                for (let p = 0; p < 14; p++) {
                    const px = hallLeft + ((p * 97 + Math.sin(t * 1.4 + p) * 28) % hallW);
                    const py = hallTop + 26 + ((t * 32 + p * 43) % Math.max(80, hallH - 35));
                    ctx.fillStyle = p % 2 === 0 ? 'rgba(244, 114, 182, 0.72)' : 'rgba(251, 113, 133, 0.65)';
                    ctx.beginPath();
                    ctx.ellipse(px, py, 5, 3, t + p, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Grand Golden Floral Wedding Arch in Center of the Hall
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.arc(gx, groundY, 148, Math.PI, 0);
                ctx.stroke();
                ctx.strokeStyle = '#fbcfe8';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(gx, groundY, 140, Math.PI, 0);
                ctx.stroke();
                ctx.restore();

                ctx.font = '24px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🌸 👑 💎 👑 🌸', gx, groundY - 156);
                ctx.textAlign = 'left';
                drawPropBubble(gx - 215, groundY - 165, '🚁📸', 1.1, '#e0f2fe', '#0284c7');
                drawPropBubble(gx + 215, groundY - 135, '🧾💸', 1.2, '#fee2e2', '#dc2626');

            } else if (sceneType === 'wedding_warm') {
                // Sunset Lawn Wedding with Floral Arch, String Lights & Dessert Table
                drawSceneBanner('#fed7aa', '#fef3c7');
                drawGround('#86efac', '#16a34a');
                const gx = cw / 2;
                // Warm Sunset Orb
                ctx.fillStyle = 'rgba(251, 146, 60, 0.75)';
                ctx.beginPath();
                ctx.arc(gx, groundY - 105, 85, 0, Math.PI * 2);
                ctx.fill();
                // Green & Floral Arch
                ctx.strokeStyle = '#15803d';
                ctx.lineWidth = 9;
                ctx.beginPath();
                ctx.arc(gx, groundY, 140, Math.PI, 0);
                ctx.stroke();
                ctx.font = '24px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🌸 🌿 🌺 🌿 🌸', gx, groundY - 148);
                ctx.textAlign = 'left';
                // Dessert Table & Music
                drawPropBubble(gx - 210, groundY - 110, '🍰🥂', 1.15, '#fffbeb', '#d97706');
                drawPropBubble(gx + 210, groundY - 125, '💍💕', 1.2, '#fdf2f8', '#ec4899');

            } else if (sceneType === 'quiet_dinner') {
                drawSceneBanner('#fff7ed', '#ffedd5');
                drawGround('#fed7aa', '#c2410c');
                // Cozy Noodle Shop Table with 2 Steaming Bowls + Red Marriage Certificates
                ctx.fillStyle = '#9a3412';
                ctx.fillRect(cw / 2 - 75, groundY - 48, 150, 12);
                ctx.fillRect(cw / 2 - 60, groundY - 36, 10, 36);
                ctx.fillRect(cw / 2 + 50, groundY - 36, 10, 36);
                ctx.font = '30px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🍜   🍜', cw / 2, groundY - 54);
                ctx.textAlign = 'left';
                drawPropBubble(cw / 2, groundY - 165, '📕💍', 1.25, '#fee2e2', '#dc2626');
                drawPropBubble(cw / 2 + 195, groundY - 115, '🏠💰', 1.25, '#dcfce7', '#16a34a');

            } else if (sceneType === 'honeymoon_flight') {
                // Realistic Arctic Night Sky, Multi-Layer Shimmering Aurora Borealis & Snow-Capped Alps
                const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
                skyGrad.addColorStop(0, '#020617');
                skyGrad.addColorStop(0.45, '#0b1936');
                skyGrad.addColorStop(0.85, '#0d3b3e');
                skyGrad.addColorStop(1, '#134e4a');
                ctx.fillStyle = skyGrad;
                ctx.fillRect(0, 0, cw, groundY);
                drawGround('#e2e8f0', '#94a3b8');

                ctx.save();
                // Crisp Starfield twinkling across Arctic Sky
                for (let s = 0; s < 46; s++) {
                    const sx = (s * 97 + 19) % cw;
                    const sy = 12 + (s * 41) % Math.max(110, groundY - 130);
                    const tw = 0.4 + Math.abs(Math.sin(t * 2.2 + s * 1.9)) * 0.6;
                    ctx.fillStyle = `rgba(248, 250, 252, ${tw})`;
                    ctx.beginPath();
                    ctx.arc(sx, sy, s % 5 === 0 ? 2.1 : 1.2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Realistic Animated Multi-Layer Aurora Borealis Curtains (Vertical Shimmering Rays)
                const drawAuroraRibbon = (baseY, amp, height, cTop, cMid, cBot, speed, phase) => {
                    const step = 12;
                    for (let x = 0; x <= cw; x += step) {
                        const wave = Math.sin(x * 0.0085 + t * speed + phase) * amp
                            + Math.cos(x * 0.017 - t * (speed * 0.6) + phase) * (amp * 0.45);
                        const rayH = height * (0.65 + 0.35 * Math.sin(x * 0.028 + t * (speed * 1.4) + phase));
                        const ryTop = baseY + wave - rayH * 0.5;
                        const ryBot = baseY + wave + rayH * 0.5;
                        const g = ctx.createLinearGradient(x, ryTop, x, ryBot);
                        g.addColorStop(0, cTop);
                        g.addColorStop(0.45, cMid);
                        g.addColorStop(0.82, cBot);
                        g.addColorStop(1, 'rgba(16, 185, 129, 0)');
                        ctx.fillStyle = g;
                        ctx.fillRect(x, ryTop, step + 2, ryBot - ryTop);
                    }
                };
                // Back Violet-Magenta Curtain
                drawAuroraRibbon(74, 24, 98, 'rgba(168, 85, 247, 0)', 'rgba(168, 85, 247, 0.28)', 'rgba(34, 211, 238, 0.34)', 0.9, 0.3);
                // Mid Emerald-Cyan Glowing Curtain
                drawAuroraRibbon(92, 28, 118, 'rgba(34, 211, 238, 0)', 'rgba(52, 211, 153, 0.48)', 'rgba(16, 185, 129, 0.62)', 1.25, 1.8);
                // Front Bright Neon-Green Shimmer Curtain
                drawAuroraRibbon(110, 20, 76, 'rgba(110, 231, 183, 0)', 'rgba(110, 231, 183, 0.44)', 'rgba(52, 211, 153, 0.18)', 1.6, 3.4);

                // Distant Misty Indigo Alpine Mountain Range (Back Layer)
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.moveTo(0, groundY);
                ctx.lineTo(cw * 0.08, groundY - 125);
                ctx.lineTo(cw * 0.19, groundY - 82);
                ctx.lineTo(cw * 0.33, groundY - 165);
                ctx.lineTo(cw * 0.48, groundY - 96);
                ctx.lineTo(cw * 0.64, groundY - 178);
                ctx.lineTo(cw * 0.78, groundY - 104);
                ctx.lineTo(cw * 0.91, groundY - 148);
                ctx.lineTo(cw, groundY - 95);
                ctx.lineTo(cw, groundY);
                ctx.closePath();
                ctx.fill();

                // Realistic Jagged Snow-Capped Alpine Peaks (Sunlit Snow Ridge + Glacier Shadow Face)
                const drawAlpinePeak = (peakX, baseW, peakH) => {
                    const peakY = groundY - peakH;
                    const leftX = peakX - baseW * 0.52;
                    const rightX = peakX + baseW * 0.54;
                    const ridgeMidX = peakX + baseW * 0.05;

                    // Left Lit Snowy Slope
                    const snowGrad = ctx.createLinearGradient(peakX, peakY, leftX, groundY);
                    snowGrad.addColorStop(0, '#f8fafc');
                    snowGrad.addColorStop(0.55, '#cbd5e1');
                    snowGrad.addColorStop(1, '#64748b');
                    ctx.fillStyle = snowGrad;
                    ctx.beginPath();
                    ctx.moveTo(peakX, peakY);
                    ctx.lineTo(peakX - baseW * 0.24, peakY + peakH * 0.44);
                    ctx.lineTo(peakX - baseW * 0.34, peakY + peakH * 0.58);
                    ctx.lineTo(leftX, groundY);
                    ctx.lineTo(ridgeMidX - baseW * 0.06, groundY);
                    ctx.lineTo(peakX - baseW * 0.04, peakY + peakH * 0.62);
                    ctx.lineTo(ridgeMidX, peakY + peakH * 0.35);
                    ctx.closePath();
                    ctx.fill();

                    // Right Shaded Glacier-Blue Rock Slope
                    const shadeGrad = ctx.createLinearGradient(peakX, peakY, rightX, groundY);
                    shadeGrad.addColorStop(0, '#94a3b8');
                    shadeGrad.addColorStop(0.45, '#334155');
                    shadeGrad.addColorStop(1, '#0f172a');
                    ctx.fillStyle = shadeGrad;
                    ctx.beginPath();
                    ctx.moveTo(peakX, peakY);
                    ctx.lineTo(ridgeMidX, peakY + peakH * 0.35);
                    ctx.lineTo(peakX - baseW * 0.04, peakY + peakH * 0.62);
                    ctx.lineTo(ridgeMidX - baseW * 0.06, groundY);
                    ctx.lineTo(rightX, groundY);
                    ctx.lineTo(peakX + baseW * 0.30, peakY + peakH * 0.54);
                    ctx.closePath();
                    ctx.fill();

                    // Crisp Jagged Snow Cap Crests along Upper Peak
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.moveTo(peakX, peakY);
                    ctx.lineTo(peakX - baseW * 0.17, peakY + peakH * 0.34);
                    ctx.lineTo(peakX - baseW * 0.09, peakY + peakH * 0.28);
                    ctx.lineTo(peakX - baseW * 0.02, peakY + peakH * 0.38);
                    ctx.lineTo(peakX + baseW * 0.06, peakY + peakH * 0.27);
                    ctx.lineTo(peakX + baseW * 0.14, peakY + peakH * 0.34);
                    ctx.closePath();
                    ctx.fill();
                };

                drawAlpinePeak(cw * 0.16, 265, Math.min(205, groundY - 70));
                drawAlpinePeak(cw * 0.35, 220, Math.min(165, groundY - 95));
                drawAlpinePeak(cw * 0.68, 250, Math.min(190, groundY - 78));
                drawAlpinePeak(cw * 0.87, 275, Math.min(220, groundY - 62));

                // Alpine Evergreen Pine Silhouette Border along Foothills
                ctx.fillStyle = '#0f2922';
                for (let px = 12; px < cw; px += 28) {
                    if (Math.abs(px - cw / 2) < 95) continue;
                    const ph = 24 + ((px * 19) % 22);
                    ctx.beginPath();
                    ctx.moveTo(px, groundY - ph);
                    ctx.lineTo(px - 10, groundY);
                    ctx.lineTo(px + 10, groundY);
                    ctx.closePath();
                    ctx.fill();
                }

                // Subtle Aurora Reflection Band across Snow/Ice Foreground
                const refGrad = ctx.createLinearGradient(0, groundY, cw, groundY);
                refGrad.addColorStop(0, 'rgba(52, 211, 153, 0.25)');
                refGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.35)');
                refGrad.addColorStop(1, 'rgba(168, 85, 247, 0.22)');
                ctx.fillStyle = refGrad;
                ctx.fillRect(0, groundY, cw, 22);
                ctx.restore();

                drawPropBubble(cw / 2, groundY - 178, '✈️🌍', 1.15, '#e0f2fe', '#0284c7');

            // --- AGE 30 OPTIONS (HOUSING) ---
            } else if (sceneType === 'mansion_keys' || sceneType === 'penthouse') {
                drawSceneBanner('#0f172a', '#1e3a8a');
                drawGround('#334155', '#64748b');
                // Floor-to-ceiling Riverview Window
                ctx.fillStyle = '#0284c7';
                ctx.fillRect(cw / 2 - 190, 25, 380, groundY - 75);
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 4;
                ctx.strokeRect(cw / 2 - 190, 25, 380, groundY - 75);
                // City skyline silhouettes
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(cw / 2 - 160, groundY - 140, 45, 90);
                ctx.fillRect(cw / 2 - 95, groundY - 175, 55, 125);
                ctx.fillRect(cw / 2 + 40, groundY - 165, 65, 115);
                if (sceneType === 'mansion_keys') {
                    drawPropBubble(cw / 2 - 135, groundY - 130, '🔑🍷', 1.2, '#fef9c3', '#ca8a04');
                    drawPropBubble(cw / 2 + 145, groundY - 145, '🪨💸', 1.3, '#fee2e2', '#dc2626');
                }

            } else if (sceneType === 'cozy_house') {
                drawSceneBanner('#fef9c3', '#fef3c7');
                drawGround('#fde68a', '#d97706');
                // Cozy Warm 3-Bedroom House Silhouette
                const hx = cw / 2;
                ctx.fillStyle = '#fffbeb';
                ctx.strokeStyle = '#d97706';
                ctx.lineWidth = 4;
                ctx.fillRect(hx - 140, groundY - 130, 280, 130);
                ctx.strokeRect(hx - 140, groundY - 130, 280, 130);
                // Roof
                ctx.fillStyle = '#ea580c';
                ctx.beginPath();
                ctx.moveTo(hx - 165, groundY - 130);
                ctx.lineTo(hx, groundY - 210);
                ctx.lineTo(hx + 165, groundY - 130);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                drawPropBubble(hx - 185, groundY - 115, '🌻🪴', 1.15, '#dcfce7', '#16a34a');
                drawPropBubble(hx + 185, groundY - 115, '🍲❤️', 1.15, '#ffedd5', '#ea580c');

            } else if (sceneType === 'small_apartment') {
                drawSceneBanner('#bae6fd', '#f0f9ff');
                drawGround('#cbd5e1', '#64748b');

                // Modern High-Rise Condominium Complex (Twin Condo Towers + Resort Pool & Palms)
                const gx = cw / 2;
                ctx.save();

                const drawCondoTower = (tx, tw, th, floors, skyDeckFloor) => {
                    const topY = groundY - th;
                    // Modern white & warm slate architectural tower body
                    ctx.fillStyle = '#f8fafc';
                    ctx.strokeStyle = '#64748b';
                    ctx.lineWidth = 2.5;
                    ctx.fillRect(tx, topY, tw, th);
                    ctx.strokeRect(tx, topY, tw, th);

                    // Vertical charcoal slate accent pillar
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(tx + tw - 26, topY, 26, th);

                    // Rooftop modern cantilever crown & infinity pool glass railing
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(tx - 6, topY - 10, tw + 12, 10);
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
                    ctx.fillRect(tx + 8, topY - 16, tw - 16, 6);

                    // Staggered glass-railing balconies & warm lit condo units
                    const floorH = Math.max(20, (th - 44) / floors);
                    for (let f = 0; f < floors; f++) {
                        const fy = topY + 12 + f * floorH;
                        if (f === skyDeckFloor) {
                            // Lush sky-garden terrace deck halfway up the condo
                            ctx.fillStyle = '#1e293b';
                            ctx.fillRect(tx + 2, fy, tw - 4, floorH - 2);
                            ctx.fillStyle = '#22c55e';
                            for (let gxBus = tx + 14; gxBus < tx + tw - 16; gxBus += 22) {
                                ctx.beginPath();
                                ctx.arc(gxBus, fy + floorH - 7, 7, 0, Math.PI * 2);
                                ctx.fill();
                            }
                            continue;
                        }
                        // Unit windows
                        const cols = Math.max(2, Math.floor((tw - 38) / 36));
                        for (let c = 0; c < cols; c++) {
                            const wx = tx + 10 + c * 36;
                            ctx.fillStyle = (f + c) % 3 === 0 ? '#fef08a' : '#bae6fd';
                            ctx.fillRect(wx, fy + 2, 26, floorH - 8);
                            // Glass balcony railing + wood louver accent
                            ctx.fillStyle = 'rgba(14, 165, 233, 0.32)';
                            ctx.strokeStyle = '#64748b';
                            ctx.lineWidth = 1.4;
                            ctx.fillRect(wx - 2, fy + floorH * 0.48, 30, floorH * 0.44);
                            ctx.strokeRect(wx - 2, fy + floorH * 0.48, 30, floorH * 0.44);
                        }
                    }
                };

                // Twin Modern Condo Towers
                const mainW = Math.min(188, cw * 0.28);
                const mainH = Math.min(268, Math.max(195, groundY - 35));
                const sideW = Math.min(148, cw * 0.22);
                const sideH = Math.min(218, Math.max(160, groundY - 68));
                drawCondoTower(gx - mainW - 14, mainW, mainH, 8, 3);
                drawCondoTower(gx + 22, sideW, sideH, 6, 2);

                // Modern Glass Condo Lobby Podium Bridge connecting the towers
                const podW = mainW + sideW + 36;
                const podX = gx - mainW - 14;
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(podX, groundY - 56, podW, 56);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(podX + 16, groundY - 40, podW - 32, 40);
                // Condo Signboard
                ctx.fillStyle = '#facc15';
                ctx.font = '900 13px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('SKY RESIDENCE CONDO', podX + podW / 2, groundY - 44);
                ctx.textAlign = 'left';

                // Sparkling Condo Pool Accent + Tropical Palm Trees on Left & Right
                const drawPalm = (px) => {
                    ctx.strokeStyle = '#92400e';
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.moveTo(px, groundY);
                    ctx.quadraticCurveTo(px + 6, groundY - 45, px + 2, groundY - 82);
                    ctx.stroke();
                    ctx.fillStyle = '#16a34a';
                    [-1.1, -0.5, 0.2, 0.8, 1.3].forEach((ang) => {
                        ctx.beginPath();
                        ctx.ellipse(px + 2 + Math.cos(ang) * 18, groundY - 82 + Math.sin(ang) * 10, 18, 5, ang, 0, Math.PI * 2);
                        ctx.fill();
                    });
                };
                drawPalm(Math.max(42, podX - 34));
                drawPalm(Math.min(cw - 42, podX + podW + 30));
                ctx.restore();

                drawPropBubble(cw / 2 - 195, groundY - 130, '🏢✨', 1.15, '#e0f2fe', '#0284c7');
                drawPropBubble(cw / 2 + 195, groundY - 130, '💰🛡️', 1.25, '#dcfce7', '#16a34a');

            } else if (sceneType === 'stock_ticker') {
                drawSceneBanner('#ecfdf5', '#d1fae5');
                drawSkyscraperBackdrop('emerald');
                drawGround('#cbd5e1', '#059669');
                // Giant Dividend Trading Screen
                const sx = cw / 2 - 170;
                const sy = groundY - 195;
                ctx.fillStyle = '#0f172a';
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.roundRect(sx, sy, 340, 115, 10);
                ctx.fill();
                ctx.stroke();
                for (let i = 0; i < 7; i++) {
                    const h = 25 + i * 11;
                    ctx.fillStyle = '#22c55e';
                    ctx.fillRect(sx + 30 + i * 42, sy + 100 - h, 24, h);
                }
                drawPropBubble(cw / 2 - 220, groundY - 95, '🧳🔑', 1.15, '#f1f5f9', '#64748b');
                drawPropBubble(cw / 2 + 220, groundY - 125, '📊💰', 1.3, '#fef08a', '#16a34a');

            // --- AGE 33 OPTIONS (LIFESTYLE UPGRADE) ---
            } else if (sceneType === 'luxury_couch') {
                // Dark Luxury Cinema Auditorium with Movie Poster on Big Screen + Velvet Cinema Chairs
                drawSceneBanner('#070b14', '#171235');
                drawGround('#1f1229', '#7e22ce');

                const gx = cw / 2;
                ctx.save();

                // Warm Cinema Wall Sconces on Left & Right Walls
                [Math.max(42, gx - 290), Math.min(cw - 42, gx + 290)].forEach((sx) => {
                    const scGlow = ctx.createRadialGradient(sx, 115, 4, sx, 115, 48);
                    scGlow.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
                    scGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
                    ctx.fillStyle = scGlow;
                    ctx.beginPath();
                    ctx.arc(sx, 115, 48, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#f59e0b';
                    ctx.fillRect(sx - 6, 106, 12, 18);
                });

                // Big Widescreen Cinema Screen with Ambient Glow & Red Velvet Theatre Curtains
                const scrW = Math.min(430, cw - 120);
                const scrH = Math.min(205, Math.max(125, groundY - 148));
                const scrX = gx - scrW / 2;
                const scrY = Math.max(18, groundY - scrH - 138);

                // Subtle cinema screen light glow illuminating the auditorium
                const screenGlow = ctx.createRadialGradient(gx, scrY + scrH / 2, scrW * 0.15, gx, scrY + scrH / 2, scrW * 0.72);
                screenGlow.addColorStop(0, 'rgba(56, 189, 248, 0.34)');
                screenGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
                ctx.fillStyle = screenGlow;
                ctx.fillRect(scrX - 90, scrY - 30, scrW + 180, scrH + 140);

                // Pleated Red Velvet Theatre Curtains on Left & Right of Screen
                const drawCurtain = (cxCurt, width) => {
                    for (let f = 0; f < 4; f++) {
                        ctx.fillStyle = f % 2 === 0 ? '#991b1b' : '#7f1d1d';
                        ctx.fillRect(cxCurt + f * (width / 4), scrY - 12, width / 4 + 1, scrH + 26);
                    }
                };
                drawCurtain(scrX - 38, 38);
                drawCurtain(scrX + scrW, 38);

                // Metallic Cinema Screen Frame
                ctx.fillStyle = '#020617';
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 4;
                ctx.fillRect(scrX - 6, scrY - 6, scrW + 12, scrH + 12);
                ctx.strokeRect(scrX - 6, scrY - 6, scrW + 12, scrH + 12);

                // Draw Uploaded Movie Poster (Image 6) Crisply on the Cinema Screen!
                if (this.cinemaPosterImg && this.cinemaPosterImg.complete && this.cinemaPosterImg.naturalWidth > 0) {
                    ctx.drawImage(this.cinemaPosterImg, scrX, scrY, scrW, scrH);
                } else {
                    const fbGrad = ctx.createLinearGradient(scrX, scrY, scrX + scrW, scrY + scrH);
                    fbGrad.addColorStop(0, '#064e3b');
                    fbGrad.addColorStop(0.5, '#1e293b');
                    fbGrad.addColorStop(1, '#1d4ed8');
                    ctx.fillStyle = fbGrad;
                    ctx.fillRect(scrX, scrY, scrW, scrH);
                }

                // Subtle Cinema Screen Gloss Reflection
                const gloss = ctx.createLinearGradient(scrX, scrY, scrX, scrY + scrH * 0.35);
                gloss.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
                gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = gloss;
                ctx.fillRect(scrX, scrY, scrW, scrH * 0.35);

                // Row of Plush Red Velvet Cinema Chairs (Neighboring Seats + Player's Center VIP Seat Backrest)
                const drawSeatBack = (sx, isVip) => {
                    const sw = isVip ? 84 : 68;
                    const sh = isVip ? 104 : 88;
                    const seatGrad = ctx.createLinearGradient(sx, groundY - sh, sx, groundY);
                    seatGrad.addColorStop(0, '#dc2626');
                    seatGrad.addColorStop(0.55, '#991b1b');
                    seatGrad.addColorStop(1, '#450a0a');
                    ctx.fillStyle = seatGrad;
                    ctx.strokeStyle = '#1f2937';
                    ctx.lineWidth = 2.5;
                    // High plush cushioned backrest
                    ctx.beginPath();
                    ctx.roundRect(sx - sw / 2, groundY - sh, sw, sh - 16, [14, 14, 6, 6]);
                    ctx.fill();
                    ctx.stroke();
                    // Quilted pillow headrest pad
                    ctx.fillStyle = '#b91c1c';
                    ctx.beginPath();
                    ctx.roundRect(sx - sw / 2 + 8, groundY - sh + 8, sw - 16, 26, 8);
                    ctx.fill();
                    // Seat base pedestal
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(sx - 18, groundY - 16, 36, 16);
                };
                drawSeatBack(gx - 175, false);
                drawSeatBack(gx - 95, false);
                drawSeatBack(gx, true); // Center VIP chair behind seated player
                drawSeatBack(gx + 95, false);
                drawSeatBack(gx + 175, false);
                ctx.restore();

                drawPropBubble(gx + 215, groundY - 110, '🛋️💸', 1.2, '#fee2e2', '#dc2626');

            } else if (sceneType === 'executive_suv') {
                drawSceneBanner('#e2e8f0', '#cbd5e1');
                drawGround('#1e293b', '#0f172a');

                // Moving executive highway lane dashes
                ctx.strokeStyle = 'rgba(248, 250, 252, 0.65)';
                ctx.lineWidth = 4;
                const roadOffset = (t * 190) % 92;
                for (let rx = -roadOffset; rx < cw + 92; rx += 92) {
                    ctx.beginPath();
                    ctx.moveTo(rx, groundY + 18);
                    ctx.lineTo(rx + 42, groundY + 18);
                    ctx.stroke();
                }

                const cx = cw / 2;
                const baseY = groundY + Math.sin(t * 14) * 1;
                ctx.save();

                // Soft under-SUV shadow
                ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
                ctx.beginPath();
                ctx.ellipse(cx, groundY + 2, 206, 10, 0, 0, Math.PI * 2);
                ctx.fill();

                // Subtle clean Honda exhaust vapor mist behind rear bumper
                for (let i = 0; i < 6; i++) {
                    const ph = (t * 1.4 + i / 6) % 1;
                    const px = cx - 208 - ph * 95;
                    const py = baseY - 22 - ph * 16 + Math.sin(t * 5 + i) * 4;
                    ctx.fillStyle = `rgba(226, 232, 240, ${(1 - ph) * 0.36})`;
                    ctx.beginPath();
                    ctx.arc(px, py, 6 + ph * 16, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Metallic Pearl-Black / Gunmetal Honda CR-V Executive SUV Cabin & Body
                const suvGrad = ctx.createLinearGradient(cx, baseY - 128, cx, baseY - 14);
                suvGrad.addColorStop(0, '#334155');
                suvGrad.addColorStop(0.45, '#18181b');
                suvGrad.addColorStop(1, '#09090b');
                ctx.fillStyle = suvGrad;
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(cx - 196, baseY - 20);
                // Upright SUV rear tailgate & sporty roof spoiler
                ctx.lineTo(cx - 202, baseY - 76);
                ctx.quadraticCurveTo(cx - 196, baseY - 118, cx - 170, baseY - 126);
                ctx.lineTo(cx - 180, baseY - 130);
                ctx.lineTo(cx + 42, baseY - 128);
                // Bold upright Honda SUV windshield & sculpted front hood
                ctx.lineTo(cx + 104, baseY - 82);
                ctx.quadraticCurveTo(cx + 178, baseY - 78, cx + 198, baseY - 62);
                ctx.quadraticCurveTo(cx + 206, baseY - 38, cx + 196, baseY - 20);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Silver Aluminum Roof Rails & Shark-Fin Antenna
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.moveTo(cx - 155, baseY - 131);
                ctx.lineTo(cx + 28, baseY - 132);
                ctx.stroke();
                ctx.fillStyle = '#18181b';
                ctx.beginPath();
                ctx.moveTo(cx - 138, baseY - 128);
                ctx.lineTo(cx - 124, baseY - 140);
                ctx.lineTo(cx - 118, baseY - 128);
                ctx.closePath();
                ctx.fill();

                // Tinted Panoramic Honda SUV Cabin Windows with Chrome Surround Trim
                ctx.fillStyle = 'rgba(30, 41, 59, 0.88)';
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(cx - 166, baseY - 82);
                ctx.lineTo(cx - 156, baseY - 118);
                ctx.lineTo(cx + 36, baseY - 119);
                ctx.lineTo(cx + 88, baseY - 82);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Forward Bright Honda LED Headlight Beam + Solid Wing Chrome Bar + Angular LED Lamp
                const beam = ctx.createLinearGradient(cx + 198, baseY - 56, cx + 310, baseY - 40);
                beam.addColorStop(0, 'rgba(224, 242, 254, 0.55)');
                beam.addColorStop(1, 'rgba(224, 242, 254, 0)');
                ctx.fillStyle = beam;
                ctx.beginPath();
                ctx.moveTo(cx + 196, baseY - 62);
                ctx.lineTo(cx + 315, baseY - 76);
                ctx.lineTo(cx + 315, baseY - 24);
                ctx.lineTo(cx + 196, baseY - 46);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#f8fafc';
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(cx + 158, baseY - 66);
                ctx.lineTo(cx + 196, baseY - 60);
                ctx.lineTo(cx + 192, baseY - 49);
                ctx.lineTo(cx + 156, baseY - 54);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Chrome Solid Wing grille bar
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(cx + 178, baseY - 46, 22, 6);

                // Iconic Honda Boomerang Rear LED Taillight
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(cx - 200, baseY - 94, 14, 38);
                ctx.fillRect(cx - 200, baseY - 66, 28, 10);
                ctx.restore();

                drawPropBubble(cx - 220, groundY - 155, '🚘🛡️', 1.2, '#fef08a', '#ca8a04');
                drawPropBubble(cx + 220, groundY - 155, '💸', 1.15, '#fee2e2', '#dc2626');

            } else if (sceneType === 'beach_sunglasses') {
                // Sunny Mediterranean Beach & Ocean Waves
                drawSceneBanner('#38bdf8', '#bae6fd');
                drawGround('#fde047', '#ca8a04');
                ctx.fillStyle = '#0284c7';
                ctx.fillRect(0, groundY - 35, cw, 35);
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(cw - 95, 65, 38, 0, Math.PI * 2);
                ctx.fill();
                drawPropBubble(cw / 2 - 200, groundY - 130, '🏖️🌴', 1.3, '#fef9c3', '#ca8a04');
                drawPropBubble(cw / 2 + 200, groundY - 130, '✈️👨‍👩‍👧', 1.25, '#e0f2fe', '#0284c7');

            } else if (sceneType === 'frugal_spreadsheet') {
                drawSceneBanner('#ecfdf5', '#bbf7d0');
                drawGround('#86efac', '#15803d');

                // Helper: 3D stacked gold bullion bar
                const drawGoldBar = (x, y, w = 52, h = 20) => {
                    ctx.save();
                    ctx.fillStyle = '#eab308';
                    ctx.strokeStyle = '#a16207';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x + 7, y);
                    ctx.lineTo(x + w - 7, y);
                    ctx.lineTo(x + w, y + h);
                    ctx.lineTo(x, y + h);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Top metallic highlight
                    ctx.fillStyle = '#fef08a';
                    ctx.beginPath();
                    ctx.moveTo(x + 10, y + 3);
                    ctx.lineTo(x + w - 10, y + 3);
                    ctx.lineTo(x + w - 13, y + 8);
                    ctx.lineTo(x + 13, y + 8);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                };

                // Helper: Faceted sparkling diamond crystal
                const drawDiamond = (cx, cy, size, phase) => {
                    const pulse = 1 + Math.sin(t * 4 + phase) * 0.06;
                    const r = size * pulse;
                    ctx.save();
                    ctx.translate(cx, cy + Math.sin(t * 2.4 + phase) * 5);
                    ctx.fillStyle = '#38bdf8';
                    ctx.strokeStyle = '#0284c7';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(-r * 0.65, -r * 0.35);
                    ctx.lineTo(r * 0.65, -r * 0.35);
                    ctx.lineTo(r, 0);
                    ctx.lineTo(0, r);
                    ctx.lineTo(-r, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Bright crystal top & center facets
                    ctx.fillStyle = '#e0f2fe';
                    ctx.beginPath();
                    ctx.moveTo(-r * 0.45, -r * 0.35);
                    ctx.lineTo(r * 0.45, -r * 0.35);
                    ctx.lineTo(0, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = '#bae6fd';
                    ctx.beginPath();
                    ctx.moveTo(-r * 0.45, 0);
                    ctx.lineTo(r * 0.45, 0);
                    ctx.lineTo(0, r * 0.92);
                    ctx.closePath();
                    ctx.fill();

                    // Twinkling 4-point star glint
                    const glint = Math.max(0.2, Math.abs(Math.sin(t * 5 + phase)));
                    ctx.fillStyle = `rgba(255, 255, 255, ${glint})`;
                    ctx.beginPath();
                    ctx.moveTo(r * 0.55, -r * 0.72);
                    ctx.lineTo(r * 0.63, -r * 0.48);
                    ctx.lineTo(r * 0.87, -r * 0.40);
                    ctx.lineTo(r * 0.63, -r * 0.32);
                    ctx.lineTo(r * 0.55, -r * 0.08);
                    ctx.lineTo(r * 0.47, -r * 0.32);
                    ctx.lineTo(r * 0.23, -r * 0.40);
                    ctx.lineTo(r * 0.47, -r * 0.48);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                };

                // Left & Right Gold Bullion Pyramids
                const leftBaseX = Math.max(40, cw / 2 - 310);
                for (let row = 0; row < 3; row++) {
                    const cols = 3 - row;
                    for (let c = 0; c < cols; c++) {
                        drawGoldBar(leftBaseX + row * 24 + c * 48, groundY - (row + 1) * 20, 50, 20);
                    }
                }
                const rightBaseX = Math.min(cw - 200, cw / 2 + 150);
                for (let row = 0; row < 3; row++) {
                    const cols = 3 - row;
                    for (let c = 0; c < cols; c++) {
                        drawGoldBar(rightBaseX + row * 24 + c * 48, groundY - (row + 1) * 20, 50, 20);
                    }
                }

                // Giant Sparkling Diamonds perched beside gold & floating
                drawDiamond(leftBaseX + 74, groundY - 88, 28, 0.5);
                drawDiamond(rightBaseX + 74, groundY - 88, 28, 2.2);
                drawDiamond(cw / 2 - 140, groundY - 175, 20, 1.4);
                drawDiamond(cw / 2 + 140, groundY - 175, 20, 3.3);

                // Floating Cash, Gold Coins, Money Bags & Gems across the treasury sky
                const wealthIcons = ['💵', '🪙', '💎', '💰', '💵', '🪙', '💎', '💰', '💵', '🪙'];
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                for (let i = 0; i < wealthIcons.length; i++) {
                    const wx = ((i + 0.5) / wealthIcons.length) * cw + Math.sin(t * 1.4 + i) * 14;
                    const wy = 115 + ((t * 42 + i * 57) % Math.max(120, groundY - 155));
                    ctx.save();
                    ctx.translate(wx, wy);
                    ctx.rotate(Math.sin(t * 2 + i) * 0.25);
                    ctx.font = `${22 + (i % 3) * 5}px sans-serif`;
                    ctx.fillText(wealthIcons[i], 0, 0);
                    ctx.restore();
                }

                // Financial Freedom Progress Bar (85%)
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.roundRect(cw / 2 - 180, 45, 360, 42, 20);
                ctx.fill();
                ctx.fillStyle = '#22c55e';
                ctx.beginPath();
                ctx.roundRect(cw / 2 - 174, 51, 300, 30, 15);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🔋 FIRE Progress: 85% On Track', cw / 2, 72);
                ctx.textAlign = 'left';
                drawPropBubble(cw / 2 + 165, groundY - 145, '📒💰', 1.25, '#fef08a', '#16a34a');

            // --- AGE 35 OPTIONS (NEWBORN CHILD) ---
            } else if (sceneType === 'baby_spoiled') {
                drawSceneBanner('#fdf2f8', '#fce7f3');
                drawGround('#fbcfe8', '#db2777');
                // Mountain of Luxury Baby Toys, Stroller & Crying Wallet
                drawPropBubble(cw / 2 - 190, groundY - 110, '🎠🧸', 1.3, '#fef3c7', '#d97706');
                drawPropBubble(cw / 2, groundY - 155, '👶👑', 1.3, '#fdf2f8', '#ec4899');
                drawPropBubble(cw / 2 + 190, groundY - 110, '🍼💸', 1.3, '#fee2e2', '#dc2626');

            } else if (sceneType === 'education_piggy') {
                drawSceneBanner('#eff6ff', '#dbeafe');
                drawGround('#cbd5e1', '#2563eb');
                // Growing Compound Education Tree with Graduation Cap
                ctx.fillStyle = '#78350f';
                ctx.fillRect(cw / 2 + 135, groundY - 110, 18, 110);
                ctx.fillStyle = '#22c55e';
                ctx.beginPath();
                ctx.arc(cw / 2 + 144, groundY - 135, 52, 0, Math.PI * 2);
                ctx.fill();
                ctx.font = '28px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🎓💰', cw / 2 + 144, groundY - 130);
                ctx.textAlign = 'left';
                drawPropBubble(cw / 2 - 140, groundY - 125, '👶📜', 1.25, '#fef9c3', '#ca8a04');

            } else if (sceneType === 'family_walk') {
                drawSceneBanner('#ecfccb', '#d9f99d');
                drawGround('#86efac', '#15803d');
                // Sunny Park with Trees, Doves & Falling Leaves
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(cw - 90, 65, 34, 0, Math.PI * 2);
                ctx.fill();
                drawPropBubble(cw / 2 - 180, groundY - 140, '🌳🕊️', 1.25, '#dcfce7', '#16a34a');
                drawPropBubble(cw / 2 + 180, groundY - 140, '👨‍👩‍👧❤️', 1.25, '#fef9c3', '#d97706');

            // --- AGE 38 OPTIONS (STARTUP vs CAREER) ---
            } else if (sceneType === 'rocket_launch') {
                drawSceneBanner('#0f172a', '#1e1b4b');
                drawGround('#334155', '#64748b');
                const rocketY = groundY - 90 - ((t * 70) % 130);
                ctx.font = '54px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🚀', cw / 2 + 140, rocketY);
                ctx.textAlign = 'left';
                drawPropBubble(cw / 2 - 165, groundY - 135, '🦄📈', 1.25, '#e0e7ff', '#4f46e5');
                drawPropBubble(cw / 2 + 215, groundY - 110, '🔥💸', 1.3, '#fee2e2', '#dc2626');

            } else if (sceneType === 'laptop_night') {
                drawSceneBanner('#1e293b', '#0f172a');
                drawGround('#334155', '#475569');
                // Warm Desk Lamp Light Cone
                ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
                ctx.beginPath();
                ctx.moveTo(cw / 2, groundY - 170);
                ctx.lineTo(cw / 2 - 140, groundY);
                ctx.lineTo(cw / 2 + 140, groundY);
                ctx.closePath();
                ctx.fill();
                drawPropBubble(cw / 2 - 150, groundY - 130, '💼📈', 1.15, '#e0f2fe', '#0284c7');
                drawPropBubble(cw / 2 + 150, groundY - 130, '💻⚡', 1.15, '#fef9c3', '#ca8a04');

            } else if (sceneType === 'franchise_deal') {
                drawSceneBanner('#fef3c7', '#fde68a');
                drawGround('#cbd5e1', '#d97706');
                // Bustling Franchise Storefront
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#ea580c';
                ctx.lineWidth = 4;
                ctx.fillRect(cw / 2 - 160, groundY - 155, 320, 155);
                ctx.strokeRect(cw / 2 - 160, groundY - 155, 320, 155);
                ctx.fillStyle = '#ea580c';
                ctx.fillRect(cw / 2 - 170, groundY - 175, 340, 32);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 15px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🏪 Franchise Store · Quarterly Payout 🪙', cw / 2, groundY - 153);
                ctx.textAlign = 'left';
                drawPropBubble(cw / 2 + 210, groundY - 120, '🤝💰', 1.3, '#dcfce7', '#16a34a');

            } else if (sceneType === 'corporate_tie') {
                drawSceneBanner('#dbeafe', '#eff6ff');
                drawSkyscraperBackdrop('blue');
                drawGround('#94a3b8', '#334155');
                drawPropBubble(cw / 2 - 165, groundY - 130, '🏢⚓', 1.25, '#e0f2fe', '#0284c7');
                drawPropBubble(cw / 2 + 165, groundY - 130, '💎🛡️', 1.25, '#dcfce7', '#16a34a');

            // --- AGE 45 OPTIONS (AGING PARENTS) ---
            } else if (sceneType === 'luxury_villa') {
                drawSceneBanner('#dcfce7', '#fef9c3');
                drawGround('#86efac', '#16a34a');
                drawPropBubble(cw / 2, groundY - 170, '🏡🏥', 1.35, '#ffffff', '#16a34a');
                drawPropBubble(cw / 2 + 210, groundY - 120, '💸❤️', 1.2, '#fee2e2', '#dc2626');

            } else if (sceneType === 'red_envelope') {
                drawSceneBanner('#fee2e2', '#fef3c7');
                drawGround('#fed7aa', '#dc2626');
                drawPropBubble(cw / 2 - 60, groundY - 155, '🧧💰', 1.3, '#fee2e2', '#dc2626');
                drawPropBubble(cw / 2 + 60, groundY - 155, '💃🍵', 1.25, '#fef9c3', '#d97706');

            } else if (sceneType === 'doctor_chart') {
                drawSceneBanner('#e0f2fe', '#f0fdf4');
                drawGround('#cbd5e1', '#0284c7');
                drawPropBubble(cw / 2 - 65, groundY - 155, '📋🩺', 1.3, '#ffffff', '#0284c7');
                drawPropBubble(cw / 2 + 65, groundY - 155, '🛡️🏥', 1.3, '#dcfce7', '#16a34a');

            } else if (sceneType === 'park_stroll') {
                drawSceneBanner('#fed7aa', '#fde68a');
                drawGround('#a7f3d0', '#059669');
                ctx.fillStyle = '#f97316';
                ctx.beginPath();
                ctx.arc(cw / 2, groundY - 120, 65, 0, Math.PI * 2);
                ctx.fill();
                drawPropBubble(cw / 2, groundY - 175, '🌅❤️', 1.3, '#fffbeb', '#ea580c');

            // --- AGE 52 OPTIONS (CHILD'S UNIVERSITY) ---
            } else if (sceneType === 'cash_fountain') {
                drawSceneBanner('#bae6fd', '#e0f2fe');
                drawSkyscraperBackdrop('blue');
                drawGround('#cbd5e1', '#475569');
                const planeX = (t * 95) % cw;
                ctx.font = '40px sans-serif';
                ctx.fillText('✈️', planeX, 75);
                drawPropBubble(cw / 2 - 150, groundY - 130, '🧳🎓', 1.25, '#e0f2fe', '#0284c7');
                drawPropBubble(cw / 2 + 165, groundY - 130, '🏦💸', 1.3, '#fee2e2', '#dc2626');

            } else if (sceneType === 'bank_transfer') {
                drawSceneBanner('#dcfce7', '#e0f2fe');
                drawSkyscraperBackdrop('emerald');
                drawGround('#cbd5e1', '#16a34a');
                drawPropBubble(cw / 2 - 150, groundY - 130, '🏦🪙', 1.3, '#fef08a', '#16a34a');
                drawPropBubble(cw / 2 + 150, groundY - 130, '🎓🏛️', 1.3, '#e0f2fe', '#0284c7');

            } else if (sceneType === 'scholarship_scroll') {
                drawSceneBanner('#fef9c3', '#fde047');
                drawSkyscraperBackdrop('gold');
                drawGround('#cbd5e1', '#ca8a04');
                drawPropBubble(cw / 2, groundY - 165, '🏆📜', 1.4, '#fef08a', '#ca8a04');

            } else if (sceneType === 'local_campus') {
                drawSceneBanner('#e0e7ff', '#dcfce7');
                drawSkyscraperBackdrop('indigo');
                drawGround('#cbd5e1', '#4f46e5');
                drawPropBubble(cw / 2 - 150, groundY - 130, '🔬🎓', 1.25, '#e0e7ff', '#4f46e5');
                drawPropBubble(cw / 2 + 150, groundY - 130, '💎🏦', 1.3, '#dcfce7', '#16a34a');

            // --- AGE 55 OPTIONS (PRE-RETIREMENT) ---
            } else if (sceneType === 'cruise_ship') {
                drawSceneBanner('#fb923c', '#38bdf8');
                drawGround('#0284c7', '#0369a1');
                // Luxury Cruise Ship Hull
                const sx = cw / 2;
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#0284c7';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(sx - 210, groundY);
                ctx.lineTo(sx - 175, groundY - 65);
                ctx.lineTo(sx + 175, groundY - 65);
                ctx.lineTo(sx + 220, groundY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                drawPropBubble(sx - 180, groundY - 140, '🚢🥂', 1.3, '#fef9c3', '#0284c7');
                drawPropBubble(sx + 180, groundY - 140, '🌍💸', 1.25, '#fee2e2', '#dc2626');

            } else if (sceneType === 'exhausted_briefcase') {
                drawSceneBanner('#334155', '#1e293b');
                drawGround('#475569', '#0f172a');
                drawPropBubble(cw / 2 - 150, groundY - 125, '🫖👓', 1.25, '#fef3c7', '#d97706');
                drawPropBubble(cw / 2 + 150, groundY - 125, '💰🏥⬇️', 1.25, '#fee2e2', '#dc2626');

            } else if (sceneType === 'gardening_smile') {
                drawSceneBanner('#ecfccb', '#fef9c3');
                drawGround('#86efac', '#16a34a');
                drawPropBubble(cw / 2 - 145, groundY - 115, '🪴🌸', 1.3, '#dcfce7', '#16a34a');
                drawPropBubble(cw / 2 + 145, groundY - 115, '🍵📖', 1.3, '#fffbeb', '#d97706');

            } else if (sceneType === 'crypto_roulette') {
                drawSceneBanner('#450a0a', '#1e1b4b');
                drawGround('#18181b', '#dc2626');

                // Financial District Skyscraper Skyline behind the Crash Chart
                const towers = [
                    { rx: 0.04, w: 88, h: 245, spire: true, shade: '#0f172a' },
                    { rx: 0.13, w: 102, h: 315, spire: false, shade: '#172554' },
                    { rx: 0.24, w: 76, h: 215, spire: true, shade: '#1e1b4b' },
                    { rx: 0.34, w: 112, h: 340, spire: true, shade: '#0f172a' },
                    { rx: 0.48, w: 94, h: 265, spire: false, shade: '#1e293b' },
                    { rx: 0.60, w: 118, h: 330, spire: true, shade: '#0f172a' },
                    { rx: 0.73, w: 84, h: 235, spire: false, shade: '#1e1b4b' },
                    { rx: 0.82, w: 105, h: 295, spire: true, shade: '#172554' },
                    { rx: 0.92, w: 86, h: 210, spire: false, shade: '#0f172a' }
                ];

                towers.forEach((b, idx) => {
                    const bx = Math.round(cw * b.rx);
                    const bh = Math.min(b.h, Math.max(130, groundY - 22));
                    const by = groundY - bh;

                    // Tower silhouette & subtle edge highlight
                    ctx.fillStyle = b.shade;
                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
                    ctx.lineWidth = 2;
                    ctx.fillRect(bx, by, b.w, bh);
                    ctx.strokeRect(bx, by, b.w, bh);

                    // Stepped penthouse crown & spire with blinking red beacon
                    if (b.spire) {
                        ctx.fillStyle = b.shade;
                        ctx.fillRect(bx + b.w * 0.22, by - 16, b.w * 0.56, 16);
                        ctx.strokeStyle = '#64748b';
                        ctx.lineWidth = 2.5;
                        ctx.beginPath();
                        ctx.moveTo(bx + b.w / 2, by - 16);
                        ctx.lineTo(bx + b.w / 2, by - 46);
                        ctx.stroke();
                        const blink = Math.sin(t * 4.5 + idx) > 0;
                        ctx.fillStyle = blink ? '#ef4444' : '#7f1d1d';
                        ctx.beginPath();
                        ctx.arc(bx + b.w / 2, by - 48, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // Lit skyscraper office window grid
                    const cols = Math.max(3, Math.floor((b.w - 16) / 16));
                    const rows = Math.max(4, Math.floor((bh - 20) / 20));
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            const hash = (idx * 31 + r * 17 + c * 13) % 11;
                            if (hash < 4) continue;
                            ctx.fillStyle = hash === 10
                                ? 'rgba(239, 68, 68, 0.65)'
                                : (hash % 2 === 0 ? 'rgba(253, 224, 71, 0.45)' : 'rgba(56, 189, 248, 0.35)');
                            ctx.fillRect(bx + 10 + c * 15, by + 12 + r * 18, 9, 10);
                        }
                    }
                });

                // Crashing Red Candlestick Bars + Plunging Red Chart Line
                const candles = [
                    { x: cw / 2 - 190, top: 62, h: 36 },
                    { x: cw / 2 - 135, top: 50, h: 42 },
                    { x: cw / 2 - 80, top: 44, h: 52 },
                    { x: cw / 2 - 20, top: 96, h: 64 },
                    { x: cw / 2 + 45, top: 152, h: 72 },
                    { x: cw / 2 + 115, top: 212, h: 68 }
                ];
                candles.forEach((cd) => {
                    if (cd.top < groundY - 25) {
                        ctx.fillStyle = 'rgba(239, 68, 68, 0.72)';
                        ctx.fillRect(cd.x - 7, cd.top, 14, Math.min(cd.h, groundY - cd.top - 10));
                    }
                });

                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(cw / 2 - 200, 60);
                ctx.lineTo(cw / 2 - 80, 40);
                ctx.lineTo(cw / 2 + 20, 140);
                ctx.lineTo(cw / 2 + 180, groundY - 25);
                ctx.stroke();
                drawPropBubble(cw / 2 - 160, groundY - 135, '📉⚡', 1.35, '#fee2e2', '#dc2626');
                drawPropBubble(cw / 2 + 160, groundY - 135, '💸💥', 1.35, '#fee2e2', '#dc2626');

            // --- AGE 60 OPTIONS (RETIREMENT FINALE) ---
            } else if (sceneType === 'champagne_toast') {
                drawSceneBanner('#312e81', '#831843');
                drawGround('#fde047', '#ca8a04');
                drawPropBubble(cw / 2 - 155, groundY - 135, '🍾🥂', 1.35, '#fef08a', '#ca8a04');
                drawPropBubble(cw / 2 + 155, groundY - 135, '🎆🏝️', 1.35, '#fce7f3', '#db2777');

            } else if (sceneType === 'cottage_view') {
                drawSceneBanner('#bae6fd', '#fef3c7');
                drawGround('#fde68a', '#0284c7');
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(0, groundY - 28, cw, 28);
                drawPropBubble(cw / 2 - 160, groundY - 130, '🏡🌊', 1.35, '#e0f2fe', '#0284c7');
                drawPropBubble(cw / 2 + 160, groundY - 130, '🪑📖', 1.25, '#fef9c3', '#d97706');

            } else if (sceneType === 'peaceful_reading') {
                drawSceneBanner('#dcfce7', '#f0fdf4');
                drawGround('#bbf7d0', '#16a34a');
                drawPropBubble(cw / 2 - 155, groundY - 130, '☯️🍵', 1.3, '#dcfce7', '#16a34a');
                drawPropBubble(cw / 2 + 155, groundY - 130, '🛡️💰', 1.3, '#fef08a', '#ca8a04');

            } else if (sceneType === 'taichi_grandkids' || sceneType === 'retirement') {
                drawSceneBanner('#fef3c7', '#fde68a');
                drawGround('#bbf7d0', '#16a34a');
                // Sunny Golden Sky & Blooming Sakura Tree
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(cw - 75, 65, 34, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#78350f';
                ctx.fillRect(cw / 2 + 140, groundY - 125, 16, 125);
                ctx.fillStyle = '#f472b6';
                ctx.beginPath();
                ctx.arc(cw / 2 + 130, groundY - 145, 45, 0, Math.PI * 2);
                ctx.arc(cw / 2 + 160, groundY - 155, 40, 0, Math.PI * 2);
                ctx.arc(cw / 2 + 150, groundY - 115, 35, 0, Math.PI * 2);
                ctx.fill();
                drawPropBubble(cw / 2 - 165, groundY - 135, '👧👦🎈', 1.3, '#fce7f3', '#ec4899');

            /* ==============================================================
               C. DISASTER & GAME OVER SCENES
               ============================================================== */
            } else if (sceneType === 'car_crash') {
                drawSceneBanner('#fee2e2', '#cbd5e1');
                drawGround('#334155', '#0f172a');

                // Road lane dashes & skid marks
                ctx.strokeStyle = 'rgba(248, 250, 252, 0.55)';
                ctx.lineWidth = 3.5;
                for (let rx = 18; rx < cw; rx += 84) {
                    ctx.beginPath();
                    ctx.moveTo(rx, groundY + 16);
                    ctx.lineTo(rx + 38, groundY + 16);
                    ctx.stroke();
                }
                ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(cw / 2 - 330, groundY - 3);
                ctx.lineTo(cw / 2 - 110, groundY - 3);
                ctx.stroke();

                // Realistic Red Toyota Sedan (Vios / Camry) colliding with crumpled hood & steam
                const tx = cw / 2 - 175;
                const ty = groundY;
                ctx.save();
                // Car shadow
                ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
                ctx.beginPath();
                ctx.ellipse(tx, ty + 2, 138, 8, 0, 0, Math.PI * 2);
                ctx.fill();

                // Rising radiator steam puffs from crumpled Toyota hood
                for (let s = 0; s < 6; s++) {
                    const sp = (t * 1.1 + s / 6) % 1;
                    const sx = tx + 98 + Math.sin(t * 4 + s * 2) * 12;
                    const sy = ty - 62 - sp * 78;
                    const sr = 8 + sp * 18;
                    ctx.fillStyle = `rgba(226, 232, 240, ${(1 - sp) * 0.62})`;
                    ctx.beginPath();
                    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Red Metallic Toyota Sedan Body
                const toyGrad = ctx.createLinearGradient(tx, ty - 102, tx, ty - 14);
                toyGrad.addColorStop(0, '#ef4444');
                toyGrad.addColorStop(0.5, '#dc2626');
                toyGrad.addColorStop(1, '#991b1b');
                ctx.fillStyle = toyGrad;
                ctx.strokeStyle = '#111827';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(tx - 130, ty - 16);
                ctx.lineTo(tx - 134, ty - 54);
                ctx.quadraticCurveTo(tx - 122, ty - 62, tx - 92, ty - 64);
                // Smooth sedan rear windshield, roof & front windshield
                ctx.lineTo(tx - 58, ty - 98);
                ctx.lineTo(tx + 18, ty - 98);
                ctx.lineTo(tx + 54, ty - 62);
                // Slightly crumpled front hood bent up from impact!
                ctx.lineTo(tx + 86, ty - 70);
                ctx.lineTo(tx + 114, ty - 54);
                ctx.lineTo(tx + 122, ty - 26);
                ctx.lineTo(tx + 116, ty - 16);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Tinted Sedan Cabin Windows (Front + Rear)
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(tx - 78, ty - 64);
                ctx.lineTo(tx - 52, ty - 91);
                ctx.lineTo(tx + 14, ty - 91);
                ctx.lineTo(tx + 44, ty - 64);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(tx - 16, ty - 91);
                ctx.lineTo(tx - 16, ty - 64);
                ctx.stroke();

                // Wide Black Trapezoidal Toyota Front Grille & Angular Headlight
                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.moveTo(tx + 96, ty - 42);
                ctx.lineTo(tx + 120, ty - 40);
                ctx.lineTo(tx + 118, ty - 22);
                ctx.lineTo(tx + 92, ty - 22);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#fef08a';
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(tx + 92, ty - 54);
                ctx.lineTo(tx + 116, ty - 48);
                ctx.lineTo(tx + 112, ty - 40);
                ctx.lineTo(tx + 88, ty - 46);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Rear Taillight & Door Handles
                ctx.fillStyle = '#fb7185';
                ctx.fillRect(tx - 134, ty - 54, 16, 12);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(tx - 6, ty - 54, 16, 4);
                ctx.fillRect(tx - 64, ty - 54, 15, 4);

                // Iconic Silver Toyota 3-Oval Emblem + "TOYOTA" Badge on Side
                const drawToyotaEmblem = (ex, ey, s) => {
                    ctx.save();
                    ctx.translate(ex, ey);
                    ctx.scale(s, s);
                    ctx.strokeStyle = '#f8fafc';
                    ctx.lineWidth = 2.2;
                    // Outer horizontal oval
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 14, 9.5, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    // Inner vertical oval
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 4.2, 8.8, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    // Inner upper horizontal oval
                    ctx.beginPath();
                    ctx.ellipse(0, -3.6, 9.5, 3.6, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                };
                drawToyotaEmblem(tx + 68, ty - 42, 0.85);
                ctx.fillStyle = '#f8fafc';
                ctx.font = '900 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('TOYOTA', tx - 38, ty - 34);
                ctx.textAlign = 'left';

                // Detailed Alloy Wheels
                const drawToyotaWheel = (wx, wy) => {
                    ctx.save();
                    ctx.translate(wx, wy);
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(0, 0, 22, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#e2e8f0';
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, 14, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.strokeStyle = '#475569';
                    ctx.lineWidth = 2.2;
                    for (let k = 0; k < 6; k++) {
                        const a = (k * Math.PI * 2) / 6;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
                        ctx.stroke();
                    }
                    ctx.restore();
                };
                drawToyotaWheel(tx - 82, ty - 14);
                drawToyotaWheel(tx + 72, ty - 14);
                ctx.restore();

                // Comic Impact Burst between Toyota and Player
                ctx.fillStyle = '#facc15';
                ctx.font = 'bold 32px sans-serif';
                ctx.fillText('💥 CRASH!', cw / 2 - 65, groundY - 130);

            } else if (sceneType === 'hospital' || sceneType === 'disability') {
                drawSceneBanner('#e0f2fe', '#f1f5f9');
                drawGround('#cbd5e1', '#64748b');

                // Helper: Multi-story Hospital Building with Red Cross Sign
                const drawHospitalBuilding = (bx, bw, bh, label, accentColor = '#ef4444', hasHelipad = false) => {
                    const topY = groundY - bh;
                    ctx.save();
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#64748b';
                    ctx.lineWidth = 2.5;
                    ctx.fillRect(bx, topY, bw, bh);
                    ctx.strokeRect(bx, topY, bw, bh);

                    // Clinical roof band
                    ctx.fillStyle = '#0284c7';
                    ctx.fillRect(bx, topY, bw, 14);

                    // Red Cross rooftop sign
                    const signW = 46;
                    const signH = 34;
                    const sx = bx + bw / 2 - signW / 2;
                    const sy = topY - signH;
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#64748b';
                    ctx.lineWidth = 2;
                    ctx.fillRect(sx, sy, signW, signH);
                    ctx.strokeRect(sx, sy, signW, signH);
                    ctx.fillStyle = accentColor;
                    ctx.fillRect(sx + signW / 2 - 4, sy + 6, 8, 22);
                    ctx.fillRect(sx + signW / 2 - 11, sy + 13, 22, 8);

                    if (hasHelipad) {
                        ctx.fillStyle = '#334155';
                        ctx.fillRect(bx + 10, topY - 10, 34, 10);
                        ctx.fillStyle = '#fde047';
                        ctx.font = 'bold 10px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('H', bx + 27, topY - 2);
                    }

                    // Hospital window grid
                    const cols = Math.max(3, Math.floor((bw - 24) / 28));
                    const rows = Math.max(2, Math.floor((bh - 70) / 30));
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            ctx.fillStyle = '#bae6fd';
                            ctx.strokeStyle = '#94a3b8';
                            ctx.lineWidth = 1.5;
                            const wx = bx + 16 + c * 28;
                            const wy = topY + 24 + r * 28;
                            ctx.fillRect(wx, wy, 18, 18);
                            ctx.strokeRect(wx, wy, 18, 18);
                        }
                    }

                    // Glass entrance canopy & label
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(bx + bw / 2 - 26, groundY - 38, 52, 38);
                    ctx.strokeStyle = '#0369a1';
                    ctx.strokeRect(bx + bw / 2 - 26, groundY - 38, 52, 38);
                    ctx.fillStyle = '#0f172a';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(label, bx + bw / 2, topY + 11);
                    ctx.textAlign = 'left';
                    ctx.restore();
                };

                // 3 Hospital Buildings in the Background Campus
                drawHospitalBuilding(Math.max(20, cw * 0.05), 165, Math.min(240, groundY - 58), 'CITY HOSPITAL', '#dc2626', true);
                drawHospitalBuilding(Math.round(cw * 0.36), 190, Math.min(210, groundY - 65), 'MEDICAL CENTER', '#ef4444', false);
                drawHospitalBuilding(Math.min(cw - 190, Math.round(cw * 0.72)), 155, Math.min(185, groundY - 68), 'REHAB CLINIC', '#dc2626', false);

                // Parked Ambulance on Far Right with Flashing Siren
                const ambX = Math.min(cw - 125, cw / 2 + 255);
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.roundRect(ambX, groundY - 58, 96, 46, 8);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(ambX + 2, groundY - 34, 92, 8);
                ctx.fillRect(ambX + 28, groundY - 52, 6, 18);
                ctx.fillRect(ambX + 22, groundY - 46, 18, 6);
                ctx.fillStyle = '#bae6fd';
                ctx.fillRect(ambX + 66, groundY - 52, 24, 18);
                // Flashing siren light
                const sirenRed = Math.sin(t * 10) > 0;
                ctx.fillStyle = sirenRed ? '#ef4444' : '#3b82f6';
                ctx.fillRect(ambX + 38, groundY - 66, 16, 8);
                // Wheels
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.arc(ambX + 22, groundY - 10, 10, 0, Math.PI * 2);
                ctx.arc(ambX + 74, groundY - 10, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Helper: Animated Medical Staff Member (Doctor / Nurse / Therapist)
                const drawMedicalStaff = (sx, roleType, phase) => {
                    const bob = Math.sin(t * 2.8 + phase) * 2.5;
                    const headY = groundY - 116 + bob;
                    ctx.save();
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    // Legs
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 4.5;
                    ctx.beginPath();
                    ctx.moveTo(sx, groundY - 52 + bob);
                    ctx.lineTo(sx - 12, groundY);
                    ctx.moveTo(sx, groundY - 52 + bob);
                    ctx.lineTo(sx + 12, groundY);
                    ctx.stroke();

                    // Medical coat / uniform
                    ctx.fillStyle = roleType === 'paramedic' ? '#06b6d4' : '#ffffff';
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(sx - 12, groundY - 94 + bob);
                    ctx.lineTo(sx + 12, groundY - 94 + bob);
                    ctx.lineTo(sx + 18, groundY - 40 + bob);
                    ctx.lineTo(sx - 18, groundY - 40 + bob);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Red cross badge on coat
                    ctx.fillStyle = '#dc2626';
                    ctx.fillRect(sx - 2, groundY - 82 + bob, 4, 12);
                    ctx.fillRect(sx - 6, groundY - 78 + bob, 12, 4);

                    // Arms (facing toward patient in center)
                    const dir = sx < cw / 2 ? 1 : -1;
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 4.5;
                    ctx.beginPath();
                    ctx.moveTo(sx, groundY - 88 + bob);
                    ctx.lineTo(sx + dir * 24, groundY - 72 + bob);
                    ctx.moveTo(sx, groundY - 88 + bob);
                    ctx.lineTo(sx - dir * 16, groundY - 64 + bob);
                    ctx.stroke();

                    // Props: clipboard (doctor), first-aid kit (paramedic)
                    if (roleType === 'doctor') {
                        ctx.fillStyle = '#92400e';
                        ctx.fillRect(sx + dir * 20, groundY - 84 + bob, 16, 22);
                        ctx.fillStyle = '#f8fafc';
                        ctx.fillRect(sx + dir * 22, groundY - 80 + bob, 12, 16);
                    } else if (roleType === 'paramedic') {
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = '#dc2626';
                        ctx.lineWidth = 2;
                        ctx.fillRect(sx + dir * 18 - 10, groundY - 76 + bob, 20, 16);
                        ctx.strokeRect(sx + dir * 18 - 10, groundY - 76 + bob, 20, 16);
                        ctx.fillStyle = '#dc2626';
                        ctx.fillRect(sx + dir * 18 - 2, groundY - 73 + bob, 4, 10);
                        ctx.fillRect(sx + dir * 18 - 5, groundY - 70 + bob, 10, 4);
                    }

                    // Head & caring smile
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.arc(sx, headY, 19, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(sx - 6, headY - 3, 2.3, 0, Math.PI * 2);
                    ctx.arc(sx + 6, headY - 3, 2.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(sx, headY + 2, 7, 0.2, Math.PI - 0.2);
                    ctx.stroke();

                    // Nurse cap or Doctor head mirror / stethoscope
                    if (roleType === 'nurse') {
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = '#475569';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(sx - 15, headY - 16);
                        ctx.lineTo(sx - 10, headY - 30);
                        ctx.lineTo(sx + 10, headY - 30);
                        ctx.lineTo(sx + 15, headY - 16);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                        ctx.fillStyle = '#dc2626';
                        ctx.fillRect(sx - 2, headY - 27, 4, 9);
                        ctx.fillRect(sx - 4.5, headY - 24.5, 9, 4);
                    } else if (roleType === 'doctor') {
                        ctx.strokeStyle = '#334155';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(sx, headY + 19, 10, 0.1, Math.PI - 0.1);
                        ctx.stroke();
                        ctx.fillStyle = '#94a3b8';
                        ctx.beginPath();
                        ctx.arc(sx + 10, headY + 24, 3.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                };

                // IV Drip Stand next to the patient
                const ivX = cw / 2 + 62;
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(ivX, groundY);
                ctx.lineTo(ivX, groundY - 150);
                ctx.moveTo(ivX - 14, groundY - 150);
                ctx.lineTo(ivX + 14, groundY - 150);
                ctx.moveTo(ivX - 16, groundY);
                ctx.lineTo(ivX + 16, groundY);
                ctx.stroke();
                ctx.fillStyle = '#bae6fd';
                ctx.strokeStyle = '#0284c7';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(ivX - 10, groundY - 144, 18, 26, 4);
                ctx.fill();
                ctx.stroke();

                // 3 Caring Medical Staff around the Injured Player
                drawMedicalStaff(cw / 2 - 120, 'doctor', 0);
                drawMedicalStaff(cw / 2 + 115, 'nurse', 1.4);
                drawMedicalStaff(cw / 2 + 190, 'paramedic', 2.7);

                if (sceneType === 'hospital') {
                    ctx.fillStyle = '#e2e8f0';
                    ctx.fillRect(cw / 2 - 150, groundY - 70, 300, 25);
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillRect(cw / 2 - 140, groundY - 45, 12, 45);
                    ctx.fillRect(cw / 2 + 128, groundY - 45, 12, 45);
                    // ECG Heart Monitor
                    const monX = cw / 2 - 210;
                    const monY = groundY - 185;
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.roundRect(monX, monY, 80, 55, 6);
                    ctx.fill();
                    const now = performance.now() / 150;
                    ctx.strokeStyle = '#22c55e';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(monX + 5, monY + 30);
                    for (let x = 0; x < 70; x += 5) {
                        const wavePhase = (x + now * 10) % 70;
                        let yOffset = 0;
                        if (wavePhase > 30 && wavePhase < 36) yOffset = -14;
                        else if (wavePhase >= 36 && wavePhase < 42) yOffset = 10;
                        ctx.lineTo(monX + 5 + x, monY + 30 + yOffset);
                    }
                    ctx.stroke();
                }

            } else if (sceneType === 'flood') {
                const stormCycle = t % 3.2;
                const flashA = stormCycle > 0.25 && stormCycle < 0.37;
                const flashB = stormCycle > 0.44 && stormCycle < 0.52;
                const lightningOn = flashA || flashB;

                // Dark thunderstorm sky with brief lightning illumination
                drawSceneBanner(lightningOn ? '#475569' : '#0f172a', lightningOn ? '#94a3b8' : '#334155');
                drawGround('#1e293b', '#0f172a');

                // Heavy rolling storm clouds across the top sky
                const cloudCount = Math.max(5, Math.ceil(cw / 220) + 1);
                for (let i = 0; i < cloudCount; i++) {
                    const cx = ((i * 230 + t * 18) % (cw + 260)) - 130;
                    const cy = 44 + (i % 2) * 18;
                    ctx.fillStyle = lightningOn ? '#334155' : '#1e293b';
                    ctx.beginPath();
                    ctx.arc(cx - 52, cy + 8, 38, 0, Math.PI * 2);
                    ctx.arc(cx, cy - 6, 50, 0, Math.PI * 2);
                    ctx.arc(cx + 56, cy + 6, 40, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = lightningOn ? '#475569' : '#0f172a';
                    ctx.beginPath();
                    ctx.arc(cx - 24, cy + 16, 32, 0, Math.PI * 2);
                    ctx.arc(cx + 28, cy + 14, 34, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Jagged lightning bolts striking down from storm clouds
                if (lightningOn) {
                    const drawBolt = (startX, startY, endY, seed) => {
                        const pts = [
                            [startX, startY],
                            [startX - 18 * seed, startY + (endY - startY) * 0.24],
                            [startX + 14 * seed, startY + (endY - startY) * 0.46],
                            [startX - 22 * seed, startY + (endY - startY) * 0.72],
                            [startX + 6 * seed, endY]
                        ];
                        ctx.save();
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
                        ctx.lineWidth = 9;
                        ctx.shadowColor = '#fef08a';
                        ctx.shadowBlur = 22;
                        ctx.beginPath();
                        pts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
                        ctx.stroke();

                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 3.2;
                        ctx.beginPath();
                        pts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
                        ctx.stroke();

                        // Side fork branch
                        ctx.lineWidth = 2.5;
                        ctx.beginPath();
                        ctx.moveTo(pts[2][0], pts[2][1]);
                        ctx.lineTo(pts[2][0] + 34 * seed, pts[2][1] + 42);
                        ctx.stroke();
                        ctx.restore();
                    };

                    const mainBoltX = cw * 0.32;
                    drawBolt(mainBoltX, 62, groundY - 120, 1);
                    if (flashB) {
                        drawBolt(cw * 0.74, 58, groundY - 105, -1);
                    }
                }

                // Main 2-story house on left-center (entire ground floor submerged!)
                const hx = Math.max(36, cw / 2 - 285);
                const hw = 180;
                const hh = 178;
                const houseTopY = groundY - hh;

                // Chimney
                ctx.fillStyle = '#7f1d1d';
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 3;
                ctx.fillRect(hx + hw - 44, houseTopY - 58, 24, 48);
                ctx.strokeRect(hx + hw - 44, houseTopY - 58, 24, 48);

                // House walls
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(hx, houseTopY, hw, hh);
                ctx.strokeRect(hx, houseTopY, hw, hh);

                // Pitched red roof
                ctx.fillStyle = '#b91c1c';
                ctx.beginPath();
                ctx.moveTo(hx - 16, houseTopY + 2);
                ctx.lineTo(hx + hw / 2, houseTopY - 68);
                ctx.lineTo(hx + hw + 16, houseTopY + 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Ground-floor front door & dark flooded windows (submerged under water)
                ctx.fillStyle = '#7c2d12';
                ctx.fillRect(hx + 24, groundY - 78, 42, 78);
                ctx.strokeRect(hx + 24, groundY - 78, 42, 78);
                ctx.fillStyle = '#1e3a8a';
                ctx.fillRect(hx + 94, groundY - 70, 56, 42);
                ctx.strokeRect(hx + 94, groundY - 70, 56, 42);

                // Second-floor warm lit windows above the waterline
                const drawWindow = (wx, wy, ww, wh, lit) => {
                    ctx.fillStyle = lit ? '#fde047' : '#1e3a8a';
                    ctx.fillRect(wx, wy, ww, wh);
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 2.5;
                    ctx.strokeRect(wx, wy, ww, wh);
                    ctx.beginPath();
                    ctx.moveTo(wx + ww / 2, wy);
                    ctx.lineTo(wx + ww / 2, wy + wh);
                    ctx.moveTo(wx, wy + wh / 2);
                    ctx.lineTo(wx + ww, wy + wh / 2);
                    ctx.stroke();
                };
                drawWindow(hx + 24, houseTopY + 18, 44, 34, true);
                drawWindow(hx + 112, houseTopY + 18, 44, 34, true);

                // Neighboring half-submerged house on the right
                const rx = Math.min(cw - 172, cw / 2 + 125);
                const rw = 142;
                const rh = 132;
                const rTopY = groundY - rh;
                ctx.fillStyle = '#cbd5e1';
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 3;
                ctx.fillRect(rx, rTopY, rw, rh);
                ctx.strokeRect(rx, rTopY, rw, rh);
                ctx.fillStyle = '#9a3412';
                ctx.beginPath();
                ctx.moveTo(rx - 12, rTopY + 2);
                ctx.lineTo(rx + rw / 2, rTopY - 52);
                ctx.lineTo(rx + rw + 12, rTopY + 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#7c2d12';
                ctx.fillRect(rx + 22, groundY - 68, 34, 68);
                ctx.strokeRect(rx + 22, groundY - 68, 34, 68);
                drawWindow(rx + 74, rTopY + 14, 44, 30, false);

                // High floodwater back layer (rises high up over ground floor & stickman chest)
                const waterSurfaceY = groundY - 114 + Math.sin(t * 2.6) * 5;
                ctx.fillStyle = 'rgba(14, 116, 144, 0.55)';
                ctx.fillRect(0, waterSurfaceY, cw, ch - waterSurfaceY);

            } else if (sceneType === 'cemetery') {
                drawSceneBanner('#1e293b', '#334155');
                drawGround('#0f172a', '#475569');
                const gx = cw / 2 + 100;
                ctx.fillStyle = '#64748b';
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(gx - 25, groundY - 70, 50, 70, [20, 20, 0, 0]);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px serif';
                ctx.textAlign = 'center';
                ctx.fillText('R.I.P', gx, groundY - 42);
                ctx.textAlign = 'left';
            }

            ctx.restore();
        }

        renderSceneFront(sceneType) {
            const ctx = this.ctx;
            const cw = ctx.canvas.width;
            const ch = ctx.canvas.height;
            const groundY = this.getGroundY();
            const t = performance.now() / 1000;

            if (sceneType === 'car' || sceneType === 'sports_car_flex') {
                const cx = cw / 2;
                const baseY = groundY + Math.sin(t * 18) * 1.1;
                ctx.save();

                // Foreground Tesla Sculpted Side Door Panel (so driver sits inside cockpit)
                const doorGrad = ctx.createLinearGradient(cx, baseY - 64, cx, baseY - 16);
                doorGrad.addColorStop(0, '#ef4444');
                doorGrad.addColorStop(0.55, '#dc2626');
                doorGrad.addColorStop(1, '#991b1b');
                ctx.fillStyle = doorGrad;
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 2.8;
                ctx.beginPath();
                ctx.moveTo(cx - 142, baseY - 64);
                ctx.lineTo(cx + 128, baseY - 62);
                ctx.lineTo(cx + 118, baseY - 18);
                ctx.lineTo(cx - 134, baseY - 18);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Sleek metallic body crease highlight + flush black Tesla door handles
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(cx - 128, baseY - 52);
                ctx.lineTo(cx + 114, baseY - 50);
                ctx.stroke();

                ctx.fillStyle = '#0f172a';
                ctx.fillRect(cx - 14, baseY - 50, 22, 4.5);
                ctx.fillRect(cx - 94, baseY - 50, 20, 4.5);

                // Side Aero Mirror
                ctx.fillStyle = '#dc2626';
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(cx + 84, baseY - 68, 12, 6, -0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Iconic Silver Tesla "T" Emblem on Side / Nose + TESLA Script
                const drawTeslaT = (tx, ty, s) => {
                    ctx.save();
                    ctx.translate(tx, ty);
                    ctx.scale(s, s);
                    ctx.fillStyle = '#f8fafc';
                    ctx.beginPath();
                    // Top curved bar
                    ctx.moveTo(-12, -8);
                    ctx.quadraticCurveTo(0, -13, 12, -8);
                    ctx.lineTo(10, -5);
                    ctx.quadraticCurveTo(0, -9, -10, -5);
                    ctx.closePath();
                    ctx.fill();
                    // T stem & shield notch
                    ctx.beginPath();
                    ctx.moveTo(-9, -4);
                    ctx.quadraticCurveTo(0, -7, 9, -4);
                    ctx.lineTo(3, -2);
                    ctx.lineTo(0, 12);
                    ctx.lineTo(-3, -2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                };
                drawTeslaT(cx + 178, baseY - 40, 0.9);
                ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
                ctx.font = '900 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('T E S L A', cx - 156, baseY - 36);

                // Yoke Steering Wheel in front of driver
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.roundRect(cx + 14, baseY - 96, 26, 15, 5);
                ctx.stroke();

                // Spinning 19" Tesla Turbine Alloy Wheels with Red Brake Calipers
                const drawTeslaWheel = (wx, wy) => {
                    ctx.save();
                    ctx.translate(wx, wy);
                    // Tire
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(0, 0, 28, 0, Math.PI * 2);
                    ctx.fill();
                    // Rim
                    ctx.fillStyle = '#cbd5e1';
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, 19, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    // Red Performance Brake Caliper
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.arc(0, 0, 13, -0.7, 0.7);
                    ctx.lineTo(0, 0);
                    ctx.closePath();
                    ctx.fill();
                    // Animated Spinning 5-Spoke Turbine Blades
                    ctx.rotate(t * 11);
                    ctx.strokeStyle = '#1e293b';
                    ctx.lineWidth = 3.2;
                    for (let k = 0; k < 5; k++) {
                        const a = (k * Math.PI * 2) / 5;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.quadraticCurveTo(Math.cos(a + 0.25) * 10, Math.sin(a + 0.25) * 10, Math.cos(a) * 18, Math.sin(a) * 18);
                        ctx.stroke();
                    }
                    // Center cap
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                };
                drawTeslaWheel(cx - 122, baseY - 14);
                drawTeslaWheel(cx + 132, baseY - 14);

                ctx.restore();
            } else if (sceneType === 'executive_suv') {
                const cx = cw / 2;
                const baseY = groundY + Math.sin(t * 14) * 1;
                ctx.save();

                // Foreground Sculpted Honda CR-V Side Door Panel (driver sits inside cabin)
                const doorGrad = ctx.createLinearGradient(cx, baseY - 82, cx, baseY - 20);
                doorGrad.addColorStop(0, '#334155');
                doorGrad.addColorStop(0.5, '#18181b');
                doorGrad.addColorStop(1, '#09090b');
                ctx.fillStyle = doorGrad;
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 2.6;
                ctx.beginPath();
                ctx.moveTo(cx - 148, baseY - 82);
                ctx.lineTo(cx + 106, baseY - 82);
                ctx.lineTo(cx + 102, baseY - 22);
                ctx.lineTo(cx - 142, baseY - 22);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Lower matte-black SUV cladding & chrome rocker trim strip
                ctx.fillStyle = '#09090b';
                ctx.fillRect(cx - 146, baseY - 28, 250, 9);
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(cx - 134, baseY - 31, 224, 3);

                // Door seam, silver chrome handles & side mirror
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(cx - 26, baseY - 82);
                ctx.lineTo(cx - 26, baseY - 24);
                ctx.stroke();
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(cx - 8, baseY - 68, 20, 4.5);
                ctx.fillRect(cx - 88, baseY - 68, 18, 4.5);
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.ellipse(cx + 76, baseY - 86, 11, 6, -0.1, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Iconic Silver Honda "H" Emblem inside Rounded Trapezoid Badge + "HONDA" Text
                const drawHondaH = (hx, hy, s) => {
                    ctx.save();
                    ctx.translate(hx, hy);
                    ctx.scale(s, s);
                    ctx.strokeStyle = '#f8fafc';
                    ctx.lineWidth = 2.2;
                    ctx.beginPath();
                    ctx.roundRect(-13, -10, 26, 20, 4);
                    ctx.stroke();
                    // Classic Honda tapered H
                    ctx.fillStyle = '#f8fafc';
                    ctx.beginPath();
                    ctx.moveTo(-8, -7);
                    ctx.lineTo(-4.5, -7);
                    ctx.lineTo(-3.5, -1);
                    ctx.lineTo(3.5, -1);
                    ctx.lineTo(4.5, -7);
                    ctx.lineTo(8, -7);
                    ctx.lineTo(6.5, 7);
                    ctx.lineTo(3.5, 7);
                    ctx.lineTo(3.5, 2);
                    ctx.lineTo(-3.5, 2);
                    ctx.lineTo(-3.5, 7);
                    ctx.lineTo(-6.5, 7);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                };
                drawHondaH(cx + 150, baseY - 46, 0.92);
                ctx.fillStyle = '#f8fafc';
                ctx.font = '900 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('H O N D A', cx - 60, baseY - 42);

                // SUV Steering Wheel in front of driver
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(cx + 18, baseY - 94, 15, 0, Math.PI * 2);
                ctx.stroke();

                // Machined Two-Tone Spinning Honda Alloy Wheels
                const drawHondaWheel = (wx, wy) => {
                    ctx.save();
                    ctx.translate(wx, wy);
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(0, 0, 30, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#e2e8f0';
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, 20, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.rotate(t * 9);
                    ctx.strokeStyle = '#1e293b';
                    ctx.lineWidth = 3;
                    for (let k = 0; k < 5; k++) {
                        const a = (k * Math.PI * 2) / 5;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(a) * 19, Math.sin(a) * 19);
                        ctx.stroke();
                    }
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(0, 0, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                };
                drawHondaWheel(cx - 122, baseY - 16);
                drawHondaWheel(cx + 124, baseY - 16);
                ctx.restore();
            } else if (sceneType === 'luxury_couch') {
                const gx = cw / 2;
                ctx.save();
                // Front Seat Cushion Edge + Left & Right Plush Red Velvet Cinema Armrests
                ctx.fillStyle = '#b91c1c';
                ctx.strokeStyle = '#450a0a';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.roundRect(gx - 42, groundY - 46, 84, 18, 6);
                ctx.fill();
                ctx.stroke();

                // Plush Armrests with Cupholders
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.roundRect(gx - 56, groundY - 62, 20, 44, 7);
                ctx.roundRect(gx + 36, groundY - 62, 20, 44, 7);
                ctx.fill();
                ctx.stroke();

                // Popcorn Bucket on Left Armrest & Cold Soda Cup on Right Armrest
                ctx.font = '24px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🍿', gx - 46, groundY - 72);
                ctx.fillText('🥤', gx + 46, groundY - 72);
                ctx.restore();
            } else if (sceneType === 'flood') {
                const stormCycle = t % 3.2;
                const lightningOn = (stormCycle > 0.25 && stormCycle < 0.37) || (stormCycle > 0.44 && stormCycle < 0.52);
                const waterSurfaceY = groundY - 114 + Math.sin(t * 2.6) * 5;

                ctx.save();

                // High translucent surging floodwater in front of house & stickman
                const waterGrad = ctx.createLinearGradient(0, waterSurfaceY, 0, ch);
                waterGrad.addColorStop(0, 'rgba(14, 165, 233, 0.56)');
                waterGrad.addColorStop(0.5, 'rgba(2, 132, 199, 0.72)');
                waterGrad.addColorStop(1, 'rgba(7, 89, 133, 0.88)');

                ctx.fillStyle = waterGrad;
                ctx.beginPath();
                ctx.moveTo(0, ch);
                for (let x = 0; x <= cw + 24; x += 24) {
                    const wy = waterSurfaceY + Math.sin(x * 0.025 + t * 4.2) * 6 + Math.cos(x * 0.015 - t * 2.4) * 3;
                    ctx.lineTo(x, wy);
                }
                ctx.lineTo(cw, ch);
                ctx.closePath();
                ctx.fill();

                // White-cyan foamy wave crest
                ctx.strokeStyle = 'rgba(224, 242, 254, 0.88)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                for (let x = 0; x <= cw + 24; x += 24) {
                    const wy = waterSurfaceY + Math.sin(x * 0.025 + t * 4.2) * 6 + Math.cos(x * 0.015 - t * 2.4) * 3;
                    if (x === 0) ctx.moveTo(x, wy);
                    else ctx.lineTo(x, wy);
                }
                ctx.stroke();

                // Secondary surging wave ripples inside the floodwater
                ctx.strokeStyle = 'rgba(186, 230, 253, 0.42)';
                ctx.lineWidth = 2.5;
                for (let row = 0; row < 2; row++) {
                    const rowY = waterSurfaceY + 34 + row * 38;
                    ctx.beginPath();
                    for (let x = 0; x <= cw + 30; x += 30) {
                        const ry = rowY + Math.sin(x * 0.03 - t * (3.2 + row) + row) * 4;
                        if (x === 0) ctx.moveTo(x, ry);
                        else ctx.lineTo(x, ry);
                    }
                    ctx.stroke();
                }

                // Bobbing floating furniture / household items swept away in flood
                const debris = [
                    { emoji: '🛋️', x: cw * 0.14, phase: 0.4, size: 32 },
                    { emoji: '📦', x: cw * 0.64, phase: 2.1, size: 28 },
                    { emoji: '🪑', x: cw * 0.86, phase: 3.8, size: 30 }
                ];
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                debris.forEach((d) => {
                    const dx = d.x + Math.sin(t * 0.8 + d.phase) * 16;
                    const dy = waterSurfaceY + Math.sin(dx * 0.025 + t * 4.2) * 6 + 4;
                    ctx.save();
                    ctx.translate(dx, dy);
                    ctx.rotate(Math.sin(t * 2.8 + d.phase) * 0.18);
                    ctx.font = `${d.size}px sans-serif`;
                    ctx.fillText(d.emoji, 0, 0);
                    ctx.restore();
                });

                // Heavy slanted downpour rain across the entire storm scene
                ctx.strokeStyle = 'rgba(224, 242, 254, 0.56)';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                const rainCount = 75;
                const fallRange = Math.max(220, waterSurfaceY + 30);
                ctx.beginPath();
                for (let i = 0; i < rainCount; i++) {
                    const rx = ((i * 83 + (i % 5) * 19) % (cw + 80)) - 20;
                    const ry = ((t * (680 + (i % 4) * 95) + i * 73) % fallRange) - 20;
                    ctx.moveTo(rx, ry);
                    ctx.lineTo(rx - 8, ry + 22);
                }
                ctx.stroke();

                // Raindrop splash ripples bouncing on the high waterline
                ctx.strokeStyle = 'rgba(224, 242, 254, 0.52)';
                ctx.lineWidth = 1.6;
                for (let i = 0; i < 10; i++) {
                    const splashPhase = (t * 2.8 + i * 0.37) % 1;
                    const sx = ((i * 137 + 50) % Math.max(200, cw - 80)) + 40;
                    const sy = waterSurfaceY + 6 + (i % 3) * 16;
                    ctx.beginPath();
                    ctx.ellipse(sx, sy, 4 + splashPhase * 14, 1.5 + splashPhase * 3.5, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Brief thunderstorm screen glare during lightning strike
                if (lightningOn) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
                    ctx.fillRect(0, 0, cw, ch);
                }

                ctx.restore();
            }
        }

        renderParticles(particles) {
            const ctx = this.ctx;
            for (const p of particles) {
                ctx.save();
                ctx.fillStyle = p.color || '#22c55e';
                ctx.font = `${p.size || 16}px sans-serif`;
                ctx.fillText(p.text || '$', p.x, p.y);
                ctx.restore();
            }
        }
    }

    /* ==========================================================================
       7B. SoundController (Web Audio API Henry Stickmin Style Synthesizer)
       ========================================================================== */
    class SoundController {
        constructor() {
            this.audioCtx = null;
            this.enabled = this.safeLoadEnabled();
        }

        safeLoadEnabled() {
            try {
                if (window.localStorage) {
                    return window.localStorage.getItem('stickman_audio_muted') !== '1';
                }
            } catch (_) {}
            return true;
        }

        safeSaveEnabled(enabled) {
            try {
                if (window.localStorage) {
                    window.localStorage.setItem('stickman_audio_muted', enabled ? '0' : '1');
                }
            } catch (_) {}
        }

        init() {
            if (!this.audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.audioCtx = new AudioContext();
                }
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().catch(() => {});
            }
        }

        // Classic Henry Stickmin UI hover tick
        playHover() {
            if (!this.enabled) return;
            this.init();
            if (!this.audioCtx) return;

            try {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + 0.04);

                gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

                osc.connect(gain);
                gain.connect(this.audioCtx.destination);

                osc.start();
                osc.stop(this.audioCtx.currentTime + 0.04);
            } catch (e) {}
        }

        // Comic Card Click / Whoosh
        playWhoosh() {
            if (!this.enabled) return;
            this.init();
            if (!this.audioCtx) return;

            try {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(900, this.audioCtx.currentTime + 0.12);

                gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.15);

                osc.connect(gain);
                gain.connect(this.audioCtx.destination);

                osc.start();
                osc.stop(this.audioCtx.currentTime + 0.15);
            } catch (e) {}
        }

        // Car Zoom / Screech
        playCarZoom() {
            if (!this.enabled) return;
            this.init();
            if (!this.audioCtx) return;

            try {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(600, this.audioCtx.currentTime + 0.4);
                osc.frequency.linearRampToValueAtTime(200, this.audioCtx.currentTime + 0.8);

                gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.8);

                osc.connect(gain);
                gain.connect(this.audioCtx.destination);

                osc.start();
                osc.stop(this.audioCtx.currentTime + 0.8);
            } catch (e) {}
        }

        // Splash sound
        playSplash() {
            if (!this.enabled) return;
            this.init();
            if (!this.audioCtx) return;

            try {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
                osc.frequency.linearRampToValueAtTime(120, this.audioCtx.currentTime + 0.25);

                gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);

                osc.connect(gain);
                gain.connect(this.audioCtx.destination);

                osc.start();
                osc.stop(this.audioCtx.currentTime + 0.3);
            } catch (e) {}
        }

        // SIGNATURE HENRY STICKMIN "FAIL" SLAM SOUND (Heavy metal impact + descending buzz)
        playFailSlam() {
            if (!this.enabled) return;
            this.init();
            if (!this.audioCtx) return;

            try {
                const now = this.audioCtx.currentTime;

                // Heavy bass impact
                const osc1 = this.audioCtx.createOscillator();
                const gain1 = this.audioCtx.createGain();
                osc1.type = 'square';
                osc1.frequency.setValueAtTime(120, now);
                osc1.frequency.exponentialRampToValueAtTime(35, now + 0.45);

                gain1.gain.setValueAtTime(0.35, now);
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

                osc1.connect(gain1);
                gain1.connect(this.audioCtx.destination);
                osc1.start(now);
                osc1.stop(now + 0.55);

                // Comedic trombone buzz
                const osc2 = this.audioCtx.createOscillator();
                const gain2 = this.audioCtx.createGain();
                osc2.type = 'sawtooth';
                osc2.frequency.setValueAtTime(140, now + 0.25);
                osc2.frequency.linearRampToValueAtTime(80, now + 0.85);

                gain2.gain.setValueAtTime(0.18, now + 0.25);
                gain2.gain.linearRampToValueAtTime(0.001, now + 0.9);

                osc2.connect(gain2);
                gain2.connect(this.audioCtx.destination);
                osc2.start(now + 0.25);
                osc2.stop(now + 0.9);
            } catch (e) {}
        }

        // Success / Milestone progress fanfare
        playSuccessChime() {
            if (!this.enabled) return;
            this.init();
            if (!this.audioCtx) return;

            try {
                const now = this.audioCtx.currentTime;
                const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
                notes.forEach((freq, idx) => {
                    const osc = this.audioCtx.createOscillator();
                    const gain = this.audioCtx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

                    gain.gain.setValueAtTime(0.12, now + idx * 0.08);
                    gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);

                    osc.connect(gain);
                    gain.connect(this.audioCtx.destination);

                    osc.start(now + idx * 0.08);
                    osc.stop(now + idx * 0.08 + 0.2);
                });
            } catch (e) {}
        }

        // Mission Complete Victory Fanfare
        playMissionComplete() {
            if (!this.enabled) return;
            this.init();
            if (!this.audioCtx) return;

            try {
                const now = this.audioCtx.currentTime;
                const melody = [
                    { f: 523.25, d: 0.15 }, // C5
                    { f: 523.25, d: 0.15 }, // C5
                    { f: 523.25, d: 0.15 }, // C5
                    { f: 659.25, d: 0.4 },  // E5
                    { f: 783.99, d: 0.4 },  // G5
                    { f: 1046.50, d: 0.8 }  // C6
                ];
                let t = now;
                melody.forEach(item => {
                    const osc = this.audioCtx.createOscillator();
                    const gain = this.audioCtx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(item.f, t);

                    gain.gain.setValueAtTime(0.15, t);
                    gain.gain.linearRampToValueAtTime(0.001, t + item.d);

                    osc.connect(gain);
                    gain.connect(this.audioCtx.destination);

                    osc.start(t);
                    osc.stop(t + item.d);
                    t += item.d;
                });
            } catch (e) {}
        }

        toggleSound() {
            this.enabled = !this.enabled;
            this.safeSaveEnabled(this.enabled);
            if (this.enabled) this.init();
            return this.enabled;
        }
    }

    /* ==========================================================================
       8. UIManager
       ========================================================================== */
    class UIManager {
        constructor(gameState, soundController = null) {
            this.gameState = gameState;
            this.sound = soundController || new SoundController();
            this.elViewport = document.getElementById('game-viewport');

            this.elHappiness = document.getElementById('stat-happiness');
            this.elFinancial = document.getElementById('stat-financial');
            this.elHealth = document.getElementById('stat-health');
            this.elFloatsContainer = document.getElementById('floating-deltas');

            this.elAgeBadge = document.getElementById('age-badge');
            this.elScenarioTitle = document.getElementById('scenario-title');
            this.elScenarioText = document.getElementById('scenario-text');

            this.elOptionsGrid = document.getElementById('options-grid');
            this.elEventModal = document.getElementById('disaster-modal');
            this.elGameOverModal = document.getElementById('game-over-modal');
            this.elVictoryModal = document.getElementById('victory-modal');

            // Prologue and Memory Flash Overlays
            this.elPrologueOverlay = document.getElementById('prologue-overlay');
            this.elPrologueChapter = document.getElementById('prologue-chapter');
            this.elPrologueTitle = document.getElementById('prologue-title');
            this.elPrologueNarrative = document.getElementById('prologue-narrative');
            this.btnPrologueNext = document.getElementById('btn-prologue-next');
            this.btnPrologueSkip = document.getElementById('btn-prologue-skip');

            this.elMemoryOverlay = document.getElementById('memory-flash-overlay');
            this.elMemoryTitle = document.getElementById('memory-title');
            this.elMemoryText = document.getElementById('memory-text');
            this.elMemoryPills = document.getElementById('memory-consequence-pills');
            this.btnMemoryContinue = document.getElementById('btn-memory-continue');

            // Fullscreen & Sound Controls
            this.btnFullscreen = document.getElementById('btn-fullscreen');
            this.fullscreenText = document.getElementById('fullscreen-text');
            this.btnSound = document.getElementById('btn-sound');
            this.soundIcon = document.getElementById('sound-icon');
            this.soundText = document.getElementById('sound-text');
            this.syncSoundButton();

            if (this.elMemoryOverlay) {
                this.elMemoryOverlay.style.display = 'none';
            }

            this.setupListeners();
        }

        syncSoundButton() {
            if (!this.btnSound || !this.sound) return;
            const muted = !this.sound.enabled;
            this.btnSound.classList.toggle('muted', muted);
            this.btnSound.setAttribute('aria-pressed', muted ? 'true' : 'false');
            if (this.soundIcon) this.soundIcon.textContent = muted ? '🔇' : '🔊';
            if (this.soundText) this.soundText.textContent = muted ? 'Muted' : 'Sound';
        }

        setCutsceneMode(active) {
            if (!this.elViewport) return;
            if (active) {
                this.elViewport.classList.add('cutscene-active');
            } else {
                this.elViewport.classList.remove('cutscene-active');
            }
            globalBus.emit('viewport:resized');
        }

        setupListeners() {
            globalBus.on('state:updated', (snapshot) => {
                this.updateStatsHUD(snapshot.attributes);
            });

            globalBus.on('attributes:changed', ({ deltas }) => {
                this.spawnFloatingNumbers(deltas);
            });

            globalBus.on('game:over', (deathInfo) => {
                this.showGameOver(deathInfo);
            });

            globalBus.on('game:won', () => {
                this.showVictory();
            });

            if (this.btnMemoryContinue) {
                this.btnMemoryContinue.addEventListener('click', () => {
                    this.dismissMemoryFlash();
                });
            }

            // Keyboard shortcut support (Space / Enter to advance cutscenes)
            window.addEventListener('keydown', (e) => {
                if (e.code === 'Space' || e.code === 'Enter') {
                    if (this.elMemoryOverlay && this.elMemoryOverlay.style.display !== 'none' && !this.elMemoryOverlay.classList.contains('hidden')) {
                        e.preventDefault();
                        this.dismissMemoryFlash();
                    } else if (this.elPrologueOverlay && this.elPrologueOverlay.style.display !== 'none') {
                        e.preventDefault();
                        this.btnPrologueNext.click();
                    } else if (this.elEventModal && !this.elEventModal.classList.contains('hidden')) {
                        e.preventDefault();
                        document.getElementById('modal-dismiss-btn').click();
                    }
                }
            });

            // Fullscreen Handler (Works Freely in Both Portrait & Landscape)
            if (this.btnFullscreen) {
                this.btnFullscreen.addEventListener('click', () => {
                    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                        const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
                        if (req) {
                            const p = req.call(document.documentElement);
                            if (p && typeof p.catch === 'function') p.catch(() => {});
                        }
                    } else {
                        const exit = document.exitFullscreen || document.webkitExitFullscreen;
                        if (exit) {
                            const p = exit.call(document);
                            if (p && typeof p.catch === 'function') p.catch(() => {});
                        }
                    }
                });
            }

            const syncFullscreenLabel = () => {
                if (!this.fullscreenText) return;
                const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
                this.fullscreenText.textContent = active ? 'Exit' : 'Fullscreen';
                globalBus.emit('viewport:resized');
            };
            document.addEventListener('fullscreenchange', syncFullscreenLabel);
            document.addEventListener('webkitfullscreenchange', syncFullscreenLabel);

            // Sound Toggle & Unlock Handler
            const unlockOnce = () => this.sound.init();
            document.addEventListener('pointerdown', unlockOnce, { once: true });
            document.addEventListener('keydown', unlockOnce, { once: true });

            if (this.btnSound) {
                this.btnSound.addEventListener('click', () => {
                    const enabled = this.sound.toggleSound();
                    this.syncSoundButton();
                    if (enabled) {
                        this.sound.playWhoosh();
                    }
                });
            }

            // Henry Stickmin style tactile hover & click delegation (skip hover SFX on touch-only mobile)
            let lastHoverTarget = null;
            let lastHoverAt = 0;
            const supportsHover = () => !window.matchMedia || window.matchMedia('(hover: hover)').matches;
            document.addEventListener('mouseover', (e) => {
                if (!supportsHover()) return;
                const target = e.target && e.target.closest ? e.target.closest('button, .option-card') : null;
                if (!target || target.disabled || target === lastHoverTarget) return;
                lastHoverTarget = target;
                const now = performance.now();
                if (now - lastHoverAt >= 65) {
                    lastHoverAt = now;
                    this.sound.playHover();
                }
            });
            document.addEventListener('mouseout', (e) => {
                if (lastHoverTarget && !lastHoverTarget.contains(e.relatedTarget)) {
                    lastHoverTarget = null;
                }
            });
            document.addEventListener('click', (e) => {
                const target = e.target && e.target.closest ? e.target.closest('button:not(.option-card)') : null;
                if (!target || target.disabled || target.id === 'btn-sound') return;
                this.sound.playWhoosh();
            });
        }

        updateStatsHUD(attributes) {
            if (!this.elHappiness) return;
            this.elHappiness.textContent = attributes.happiness;
            this.elFinancial.textContent = attributes.financial;
            this.elHealth.textContent = attributes.health;

            this.toggleDanger(this.elHappiness, attributes.happiness <= 2);
            this.toggleDanger(this.elFinancial, attributes.financial <= 2);
            this.toggleDanger(this.elHealth, attributes.health <= 2);
        }

        toggleDanger(element, isDanger) {
            if (!element) return;
            if (isDanger) {
                element.classList.add('stat-danger');
            } else {
                element.classList.remove('stat-danger');
            }
        }

        spawnFloatingNumbers(deltas) {
            if (!this.elFloatsContainer) return;
            this.elFloatsContainer.innerHTML = '';
            const items = [
                { key: 'happiness', icon: '❤️', val: deltas.happiness },
                { key: 'financial', icon: '💰', val: deltas.financial },
                { key: 'health', icon: '🏥', val: deltas.health }
            ];

            items.forEach(item => {
                if (item.val === 0) return;
                const tag = document.createElement('div');
                const sign = item.val > 0 ? `+${item.val}` : `${item.val}`;
                tag.className = `floating-delta ${item.val > 0 ? 'delta-positive' : 'delta-negative'}`;
                tag.textContent = `${item.icon} ${sign}`;
                this.elFloatsContainer.appendChild(tag);

                setTimeout(() => {
                    tag.remove();
                }, 1800);
            });
        }

        renderMilestone(milestone, onSelectCallback) {
            this.setCutsceneMode(false);
            this.elAgeBadge.textContent = `AGE: ${milestone.age}`;
            this.elScenarioTitle.textContent = milestone.title;
            this.elScenarioText.textContent = milestone.scenario;

            this.elOptionsGrid.innerHTML = '';

            milestone.options.forEach((opt) => {
                const btn = document.createElement('button');
                btn.className = 'option-card';
                btn.innerHTML = `
                    <div class="option-header">
                        <span class="option-letter">${opt.id}</span>
                    </div>
                    <div class="option-body">${opt.label}</div>
                `;
                btn.addEventListener('click', () => {
                    onSelectCallback(opt);
                });
                this.elOptionsGrid.appendChild(btn);
            });
        }

        dismissMemoryFlash() {
            if (!this.elMemoryOverlay) return;
            this.elMemoryOverlay.classList.add('hidden');
            this.elMemoryOverlay.style.display = 'none';
            if (this.onMemoryContinueCallback) {
                const cb = this.onMemoryContinueCallback;
                this.onMemoryContinueCallback = null;
                cb();
            }
        }

        showMemoryFlash(option, onContinue) {
            this.onMemoryContinueCallback = onContinue;
            this.setCutsceneMode(true);

            // Subtle camera shutter flash
            const flash = document.createElement('div');
            flash.className = 'flash-effect';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 400);

            // Populate Bottom Cinematic Subtitle Bar (NO wall of text)
            this.elMemoryOverlay.style.display = 'flex';
            this.elMemoryOverlay.classList.remove('hidden');
            this.elMemoryTitle.textContent = option.memoryTitle || 'Life Moment';

            // Show consequence pills
            this.elMemoryPills.innerHTML = '';
            const cons = option.consequence;
            [
                { icon: '❤️', val: cons.happiness },
                { icon: '💰', val: cons.financial },
                { icon: '🏥', val: cons.health }
            ].forEach(c => {
                if (c.val === 0) return;
                const pill = document.createElement('span');
                pill.className = `pill ${c.val < 0 ? 'pill-neg' : 'pill-pos'}`;
                pill.textContent = `${c.icon} ${c.val >= 0 ? '+' : ''}${c.val}`;
                this.elMemoryPills.appendChild(pill);
            });
            globalBus.emit('viewport:resized');
        }

        showDisasterModal(disasterData, evaluation, onDismiss) {
            this.setCutsceneMode(true);
            const modal = this.elEventModal;
            modal.classList.remove('hidden');

            document.getElementById('modal-event-title').textContent = disasterData.title;
            document.getElementById('modal-protection-used').textContent = `🛡️ ${evaluation.protectionUsed}`;

            const scenarioEl = document.getElementById('modal-event-scenario');
            if (scenarioEl) {
                scenarioEl.textContent = disasterData.scenario || '';
            }

            const narrativeEl = document.getElementById('modal-narrative');
            if (narrativeEl) {
                narrativeEl.textContent = evaluation.narrative || '';
            }

            const consDiv = document.getElementById('modal-consequence-pills');
            consDiv.innerHTML = '';
            const cons = evaluation.consequence;
            [
                { icon: '❤️', val: cons.happiness },
                { icon: '💰', val: cons.financial },
                { icon: '🏥', val: cons.health }
            ].forEach(c => {
                const pill = document.createElement('span');
                pill.className = `pill ${c.val < 0 ? 'pill-neg' : (c.val > 0 ? 'pill-pos' : 'pill-neutral')}`;
                pill.textContent = `${c.icon} ${c.val >= 0 ? '+' : ''}${c.val}`;
                consDiv.appendChild(pill);
            });

            const confirmBtn = document.getElementById('modal-dismiss-btn');
            confirmBtn.onclick = () => {
                modal.classList.add('hidden');
                if (onDismiss) onDismiss();
            };
            globalBus.emit('viewport:resized');
        }

        showGameOver(deathInfo) {
            this.setCutsceneMode(false);
            const modal = this.elGameOverModal;
            modal.classList.remove('hidden');

            document.getElementById('game-over-quote').textContent = `"${deathInfo.message}"`;
            document.getElementById('game-over-cause').textContent =
                `Journey ended at Age ${deathInfo.age} when ${deathInfo.attribute.toUpperCase()} hit 0 (${deathInfo.eventName})`;

            const retryBtn = document.getElementById('btn-retry');
            retryBtn.onclick = () => {
                modal.classList.add('hidden');
                globalBus.emit('game:restart');
            };
        }

        showVictory() {
            this.setCutsceneMode(false);
            const modal = this.elVictoryModal;
            modal.classList.remove('hidden');

            const evaluation = RulesEngine.generateWinEvaluation(this.gameState);

            const tbody = document.getElementById('victory-table-body');
            tbody.innerHTML = '';
            evaluation.summaryTable.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${row.category}</td><td><strong>${row.score}</strong></td>`;
                tbody.appendChild(tr);
            });

            document.getElementById('victory-narrative').innerText = evaluation.narrative;

            const restartBtn = document.getElementById('btn-win-restart');
            restartBtn.onclick = () => {
                modal.classList.add('hidden');
                globalBus.emit('game:restart');
            };
        }
    }

    /* ==========================================================================
       9. GameApp Controller (Prologue, Fullscreen Canvas, Game Loop)
       ========================================================================== */
    class GameApp {
        constructor() {
            this.gameState = new GameState();
            this.randomEventManager = new RandomEventManager(this.gameState);

            this.canvas = document.getElementById('game-canvas');
            this.ctx = this.canvas.getContext('2d');

            // 5 Distinct Characters using Pure Skeletal Rigging
            this.player = new Character('player');
            this.dad = new Character('dad');       // Top Hat + Handlebar Mustache
            this.mom = new Character('mom');       // Long Red Flowing Hair + Lashes
            this.friend = new Character('friend'); // Over-Ear DJ Headphones
            this.bride = new Character('bride');   // White Wedding Dress + Veil & Bouquet

            this.characters = [this.dad, this.mom, this.friend, this.player, this.bride];
            this.renderer = new StickmanRenderer(this.ctx);

            this.sound = new SoundController();
            this.ui = new UIManager(this.gameState, this.sound);

            this.currentMilestoneIndex = 0;
            this.currentSceneType = 'prologue_baby';
            this.particles = [];
            this.lastTime = performance.now();

            this.prologueStep = 0;
            this.inPrologue = true;
            this.inCutscene = false;
            this.canvasLogicalScale = 1;

            this.init();
        }

        init() {
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            window.addEventListener('orientationchange', () => {
                this.resizeCanvas();
                setTimeout(() => this.resizeCanvas(), 140);
            });
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', () => this.resizeCanvas());
            }
            globalBus.on('viewport:resized', () => {
                this.resizeCanvas();
                requestAnimationFrame(() => this.resizeCanvas());
            });

            globalBus.on('game:restart', () => {
                this.restart();
            });

            globalBus.on('game:over', (deathInfo) => {
                this.sound.playFailSlam();
                if (deathInfo && deathInfo.attribute === 'health') {
                    this.currentSceneType = 'hospital';
                    this.player.play('dead_flat');
                } else if (deathInfo && deathInfo.attribute === 'financial') {
                    this.currentSceneType = 'broke';
                    this.player.play('crying_broke');
                } else {
                    this.currentSceneType = 'cemetery';
                    this.player.play('gravestone_mourn');
                }
            });

            globalBus.on('game:won', () => {
                this.currentSceneType = 'retirement';
                this.syncRendererGroundOffset();
                const cw = this.canvas.width;
                const groundY = this.renderer.getGroundY();
                this.player.setPosition(cw / 2 - 42, groundY);
                this.player.play('happy_dance');
                this.bride.visible = true;
                this.setBrideStyle(false);
                this.bride.setPosition(cw / 2 + 42, groundY);
                this.bride.play('happy_dance');
                this.dad.visible = true;
                this.mom.visible = true;
                this.friend.visible = true;
                this.dad.setPosition(cw / 2 - 190, groundY);
                this.mom.setPosition(cw / 2 - 120, groundY);
                this.friend.setPosition(cw / 2 + 150, groundY);
                this.dad.play('dad_proud');
                this.mom.play('mom_wave');
                this.friend.play('friend_groove');
                this.sound.playMissionComplete();
            });

            this.setupPrologue();
            requestAnimationFrame((t) => this.loop(t));
        }

        syncRendererGroundOffset() {
            const scale = this.canvasLogicalScale || 1;
            const dock = document.querySelector('.decision-dock');
            const isCutscene = this.ui && this.ui.elViewport && this.ui.elViewport.classList.contains('cutscene-active');

            let barCssH = 0;
            if (!isCutscene && dock) {
                barCssH = dock.offsetHeight || Math.round(window.innerHeight * 0.5);
            } else {
                const bars = document.querySelectorAll('.cinematic-bottom-bar');
                for (const bar of bars) {
                    if (!bar.classList.contains('hidden') && bar.style.display !== 'none' && bar.offsetHeight > 0) {
                        barCssH = Math.max(barCssH, bar.offsetHeight);
                    }
                }
            }

            const barLogicalH = Math.round(barCssH * scale);
            this.renderer.groundOffset = Math.max(105, barLogicalH + 18);
        }

        resizeCanvas() {
            const container = document.getElementById('stage-container');
            if (container) {
                const viewW = Math.max(320, container.clientWidth);
                const viewH = Math.max(240, container.clientHeight);
                const prevW = this.canvas.width || viewW;

                // Dual-orientation logical scaling: roomy height on short landscape & roomy width on narrow portrait
                const scaleForHeight = viewH < 640 ? (640 / viewH) : 1;
                const scaleForWidth = viewW < 680 ? (680 / viewW) : 1;
                this.canvasLogicalScale = Math.min(2.4, Math.max(scaleForHeight, scaleForWidth));
                this.canvas.width = Math.round(viewW * this.canvasLogicalScale);
                this.canvas.height = Math.round(viewH * this.canvasLogicalScale);

                this.syncRendererGroundOffset();

                if (this.inCutscene && prevW > 0 && prevW !== this.canvas.width) {
                    const ratioX = this.canvas.width / prevW;
                    for (const char of this.characters) {
                        if (char && char.visible) {
                            char.skeleton.root.localX = Math.round(char.skeleton.root.localX * ratioX);
                        }
                    }
                }

                this.updateCharacterPositions();
            }
        }

        setBrideStyle(isWedding = false) {
            if (!this.bride || !this.bride.skeleton) return;
            this.bride.skeleton.hasWeddingDress = true;
            this.bride.skeleton.hasBridalVeil = Boolean(isWedding);
            this.bride.skeleton.hasBouquet = Boolean(isWedding);
        }

        updateCharacterPositions() {
            const cw = this.canvas.width;
            const groundY = this.renderer.getGroundY();

            if (this.inPrologue) {
                this.bride.visible = false;
                if (this.prologueStep === 0) {
                    this.player.visible = false;
                    this.dad.visible = true;
                    this.dad.setPosition(cw / 2 - 115, groundY);
                    this.mom.visible = true;
                    this.mom.setPosition(cw / 2 + 115, groundY);
                    this.friend.visible = false;
                } else if (this.prologueStep === 1) {
                    this.player.visible = true;
                    this.player.setPosition(cw / 2 - 50, groundY);
                    this.friend.visible = true;
                    this.friend.setPosition(cw / 2 + 80, groundY);
                    this.dad.visible = true;
                    this.dad.setPosition(cw / 2 - 210, groundY);
                    this.mom.visible = true;
                    this.mom.setPosition(cw / 2 + 210, groundY);
                } else if (this.prologueStep === 2) {
                    const bikeGap = Math.min(165, Math.max(112, Math.floor((cw - 140) / 3)));
                    this.dad.visible = true;
                    this.dad.setPosition(cw / 2 - bikeGap * 1.5, groundY);
                    this.player.visible = true;
                    this.player.setPosition(cw / 2 - bikeGap * 0.5, groundY);
                    this.friend.visible = true;
                    this.friend.setPosition(cw / 2 + bikeGap * 0.5, groundY);
                    this.mom.visible = true;
                    this.mom.setPosition(cw / 2 + bikeGap * 1.5, groundY);
                } else if (this.prologueStep === 3) {
                    this.player.visible = true;
                    this.player.setPosition(cw / 2, groundY);
                    this.dad.visible = true;
                    this.dad.setPosition(cw / 2 - 160, groundY);
                    this.mom.visible = true;
                    this.mom.setPosition(cw / 2 - 90, groundY);
                    this.friend.visible = true;
                    this.friend.setPosition(cw / 2 + 125, groundY);
                }
            } else if (!this.inCutscene) {
                // Main Milestone Decision View
                this.player.visible = true;
                this.player.setPosition(cw / 2, groundY);
                this.bride.visible = false;

                const currentAge = this.gameState.currentAge;
                if (currentAge === 18) {
                    this.friend.visible = true;
                    this.friend.setPosition(cw / 2 + 135, groundY);
                    this.dad.visible = false;
                    this.mom.visible = false;
                } else if (currentAge === 28) {
                    // Wedding Milestone: Groom & Bride in White Wedding Dress under Arch + Parents
                    this.player.setPosition(cw / 2 - 42, groundY);
                    this.bride.visible = true;
                    this.setBrideStyle(true);
                    this.bride.setPosition(cw / 2 + 42, groundY);
                    this.bride.play('happy_dance');
                    this.dad.visible = true;
                    this.dad.setPosition(cw / 2 - 175, groundY);
                    this.dad.play('dad_proud');
                    this.mom.visible = true;
                    this.mom.setPosition(cw / 2 + 175, groundY);
                    this.mom.play('mom_wave');
                    this.friend.visible = false;
                } else if (currentAge === 30) {
                    // First Home Together
                    this.player.setPosition(cw / 2 - 42, groundY);
                    this.bride.visible = true;
                    this.setBrideStyle(false);
                    this.bride.setPosition(cw / 2 + 44, groundY);
                    this.bride.play('mom_wave');
                    this.dad.visible = false;
                    this.mom.visible = false;
                    this.friend.visible = false;
                } else if (currentAge === 35) {
                    // Baby Born: Husband & Wife (Bride) Cradling Baby + Grandparents
                    this.player.setPosition(cw / 2 - 46, groundY);
                    this.bride.visible = true;
                    this.setBrideStyle(false);
                    this.bride.setPosition(cw / 2 + 46, groundY);
                    this.bride.play('mom_cradle');
                    this.dad.visible = true;
                    this.dad.setPosition(cw / 2 - 180, groundY);
                    this.dad.play('dad_proud');
                    this.mom.visible = true;
                    this.mom.setPosition(cw / 2 + 180, groundY);
                    this.mom.play('mom_wave');
                    this.friend.visible = false;
                } else if (currentAge === 45) {
                    // Family Park Stroll
                    this.player.setPosition(cw / 2 - 42, groundY);
                    this.bride.visible = true;
                    this.setBrideStyle(false);
                    this.bride.setPosition(cw / 2 + 42, groundY);
                    this.bride.play('mom_wave');
                    this.dad.visible = true;
                    this.dad.setPosition(cw / 2 - 175, groundY);
                    this.dad.play('dad_proud');
                    this.mom.visible = true;
                    this.mom.setPosition(cw / 2 + 175, groundY);
                    this.mom.play('mom_wave');
                    this.friend.visible = false;
                } else if (currentAge === 52 || currentAge === 55 || currentAge >= 60) {
                    // Later Family & Retirement Years Together
                    this.player.setPosition(cw / 2 - 42, groundY);
                    this.bride.visible = true;
                    this.setBrideStyle(false);
                    this.bride.setPosition(cw / 2 + 44, groundY);
                    this.bride.play(currentAge >= 60 ? 'happy_dance' : 'mom_wave');
                    this.dad.visible = false;
                    this.mom.visible = false;
                    this.friend.visible = false;
                } else {
                    this.dad.visible = false;
                    this.mom.visible = false;
                    this.friend.visible = false;
                }
            } else {
                // Keep all visible cutscene characters anchored to current groundY
                for (const char of this.characters) {
                    if (char && char.visible) {
                        char.skeleton.root.localY = groundY;
                    }
                }
            }
        }

        setupPrologue() {
            this.ui.setCutsceneMode(true);
            const prologueChapters = [
                {
                    chapter: 'Prologue · Age 0–3',
                    title: 'First cries in the warm embrace of Mom and Dad',
                    scene: 'prologue_baby'
                },
                {
                    chapter: 'Childhood · Age 7–12',
                    title: 'Gold stars, study desks, popsicles, and best friends',
                    scene: 'prologue_school'
                },
                {
                    chapter: 'Youth · Age 13–17',
                    title: 'All four riding together into the sunset with warm milk',
                    scene: 'prologue_teen'
                },
                {
                    chapter: 'Coming of Age · Age 18',
                    title: 'Stepping through university gates — your turn at the wheel!',
                    scene: 'prologue_adult18'
                }
            ];

            const updatePrologueUI = () => {
                this.ui.setCutsceneMode(true);
                const cur = prologueChapters[this.prologueStep];
                this.ui.elPrologueChapter.textContent = cur.chapter;
                this.ui.elPrologueTitle.textContent = cur.title;
                this.currentSceneType = cur.scene;

                this.resizeCanvas();

                if (this.prologueStep === 0) {
                    this.dad.play('dad_rock_baby');
                    this.mom.play('mom_cradle');
                } else if (this.prologueStep === 1) {
                    this.player.play('happy_dance');
                    this.friend.play('friend_groove');
                    this.dad.play('dad_proud');
                    this.mom.play('mom_wave');
                } else if (this.prologueStep === 2) {
                    this.player.play('bike_ride');
                    this.friend.play('friend_bike');
                    this.dad.play('bike_ride');
                    this.mom.play('bike_ride');
                    setTimeout(() => this.sound.playSuccessChime(), 130);
                } else if (this.prologueStep === 3) {
                    this.player.play('flaunt_phone');
                    this.dad.play('dad_proud');
                    this.mom.play('mom_wave');
                    this.friend.play('friend_groove');
                    setTimeout(() => this.sound.playSuccessChime(), 130);
                }

                if (this.prologueStep === prologueChapters.length - 1) {
                    this.ui.btnPrologueNext.textContent = 'Start Journey ➜';
                } else {
                    this.ui.btnPrologueNext.textContent = 'Next Scene ➜';
                }
            };

            this.ui.btnPrologueNext.onclick = () => {
                this.prologueStep++;
                if (this.prologueStep >= prologueChapters.length) {
                    this.finishPrologue();
                } else {
                    updatePrologueUI();
                }
            };

            this.ui.btnPrologueSkip.onclick = () => {
                this.finishPrologue();
            };

            updatePrologueUI();
        }

        finishPrologue() {
            this.inPrologue = false;
            this.ui.elPrologueOverlay.style.opacity = '0';
            setTimeout(() => {
                this.ui.elPrologueOverlay.style.display = 'none';
                this.loadMilestone(0);
            }, 250);
        }

        restart() {
            this.gameState.reset();
            this.currentMilestoneIndex = 0;
            this.inCutscene = false;
            this.randomEventManager.initSchedule();
            this.loadMilestone(0);
        }

        loadMilestone(index) {
            if (index >= STORY_MILESTONES.length) {
                this.gameState.triggerVictory();
                return;
            }

            this.inCutscene = false;
            const milestone = STORY_MILESTONES[index];
            this.gameState.currentAge = milestone.age;

            this.configureSceneForMilestone(milestone);
            this.ui.renderMilestone(milestone, (chosenOption) => {
                this.handlePlayerChoice(chosenOption, milestone);
            });
            this.resizeCanvas();
        }

        configureSceneForMilestone(milestone) {
            const age = milestone ? milestone.age : 18;
            if (age === 18) {
                this.currentSceneType = 'university';
                this.player.play('idle');
                this.friend.play('friend_groove');
            } else if (age === 23) {
                this.currentSceneType = 'workplace';
                this.player.play('idle');
            } else if (age === 25) {
                this.currentSceneType = 'car';
                this.player.play('sports_car_flex');
            } else if (age === 28) {
                this.currentSceneType = 'wedding_altar';
                this.player.play('happy_dance');
            } else if (age === 30) {
                this.currentSceneType = 'cozy_house';
                this.player.play('idle');
            } else if (age === 33) {
                this.currentSceneType = 'penthouse';
                this.player.play('rich_swagger');
            } else if (age === 35) {
                this.currentSceneType = 'prologue_baby';
                this.player.play('dad_rock_baby');
            } else if (age === 38) {
                this.currentSceneType = 'franchise_deal';
                this.player.play('idle');
            } else if (age === 45) {
                this.currentSceneType = 'park_stroll';
                this.player.play('idle');
            } else if (age === 52) {
                this.currentSceneType = 'bank_transfer';
                this.player.play('idle');
            } else if (age === 55) {
                this.currentSceneType = 'gardening_smile';
                this.player.play('idle');
            } else if (age >= 60) {
                this.currentSceneType = 'retirement';
                this.player.play('happy_dance');
            }
        }

        playChoiceCutsceneAudio(option) {
            if (!this.sound || !this.gameState.isAlive) return;
            const rx = option ? option.animationReaction : '';
            const con = (option && option.consequence) || {};

            const failReactions = ['frugal_sad', 'clunker_rattle', 'bus_hanging', 'exhausted_briefcase', 'crypto_roulette'];
            const isFailChoice = failReactions.includes(rx)
                || ((con.financial || 0) <= -3 && (con.happiness || 0) <= 0)
                || ((con.health || 0) <= -2 && (con.happiness || 0) <= 0);

            if (isFailChoice) {
                this.sound.playFailSlam();
                return;
            }

            if (['sports_car_flex', 'sedan_drive', 'executive_suv', 'rocket_launch', 'honeymoon_flight', 'cruise_ship'].includes(rx)) {
                this.sound.playCarZoom();
            } else if (['show_off_phone', 'party_dance', 'cocktail_party', 'mansion_keys', 'luxury_couch', 'beach_sunglasses', 'luxury_villa', 'champagne_toast', 'wedding_extravagant', 'wedding_warm', 'shield_protect', 'guardian_shield', 'smart_save', 'iron_piggybank', 'stock_ticker', 'education_piggy', 'franchise_deal', 'red_envelope', 'cash_fountain', 'bank_transfer', 'scholarship_scroll'].includes(rx) || (con.happiness || 0) >= 2) {
                this.sound.playSuccessChime();
            } else {
                this.sound.playWhoosh();
            }
        }

        playChoiceCutscene(option, milestone) {
            this.inCutscene = true;
            this.currentSceneType = option.animationReaction || 'university';
            this.ui.setCutsceneMode(true);
            this.syncRendererGroundOffset();
            this.playChoiceCutsceneAudio(option);

            const cw = this.canvas.width;
            const groundY = this.renderer.getGroundY();

            // Default visibility
            this.player.visible = true;
            this.player.setPosition(cw / 2, groundY);
            this.dad.visible = false;
            this.mom.visible = false;
            this.friend.visible = false;
            this.bride.visible = false;

            const rx = option.animationReaction;
            if (rx === 'show_off_phone') {
                this.player.play('flaunt_phone');
                this.friend.visible = true;
                this.friend.setPosition(cw / 2 + 120, groundY);
                this.friend.play('shocked');
            } else if (rx === 'party_dance' || rx === 'cocktail_party' || rx === 'franchise_deal') {
                this.player.setPosition(cw / 2 - 45, groundY);
                this.player.play('happy_dance');
                this.friend.visible = true;
                this.friend.setPosition(cw / 2 + 65, groundY);
                this.friend.play('friend_groove');
            } else if (rx === 'wedding_extravagant' || rx === 'wedding_warm' || rx === 'quiet_dinner' || rx === 'honeymoon_flight') {
                this.player.setPosition(cw / 2 - 40, groundY);
                this.player.play('happy_dance');
                this.bride.visible = true;
                this.setBrideStyle(true);
                this.bride.setPosition(cw / 2 + 40, groundY);
                this.bride.play('happy_dance');
                if (rx === 'wedding_warm' || rx === 'wedding_extravagant') {
                    this.dad.visible = true;
                    this.dad.setPosition(cw / 2 - 165, groundY);
                    this.dad.play('dad_proud');
                    this.mom.visible = true;
                    this.mom.setPosition(cw / 2 + 150, groundY);
                    this.mom.play('mom_wave');
                    this.friend.visible = true;
                    this.friend.setPosition(cw / 2 + 225, groundY);
                    this.friend.play('friend_groove');
                } else if (rx === 'quiet_dinner') {
                    this.dad.visible = true;
                    this.dad.setPosition(cw / 2 - 155, groundY);
                    this.dad.play('dad_proud');
                    this.mom.visible = true;
                    this.mom.setPosition(cw / 2 + 155, groundY);
                    this.mom.play('mom_wave');
                }
            } else if (rx === 'baby_spoiled' || rx === 'education_piggy' || rx === 'guardian_shield' || rx === 'family_walk') {
                this.player.setPosition(cw / 2 - 44, groundY);
                this.player.play(rx === 'family_walk' ? 'happy_dance' : 'dad_rock_baby');
                this.bride.visible = true;
                this.setBrideStyle(false);
                this.bride.setPosition(cw / 2 + 44, groundY);
                this.bride.play('mom_cradle');
                if (rx === 'guardian_shield' || rx === 'family_walk') {
                    this.dad.visible = true;
                    this.dad.setPosition(cw / 2 - 175, groundY);
                    this.dad.play('dad_proud');
                    this.mom.visible = true;
                    this.mom.setPosition(cw / 2 + 175, groundY);
                    this.mom.play('mom_wave');
                }
            } else if (rx === 'mansion_keys' || rx === 'cozy_house' || rx === 'small_apartment' || rx === 'beach_sunglasses' || rx === 'luxury_villa' || rx === 'red_envelope' || rx === 'doctor_chart' || rx === 'park_stroll' || rx === 'cruise_ship' || rx === 'cottage_view' || rx === 'peaceful_reading' || rx === 'taichi_grandkids' || rx === 'champagne_toast') {
                this.player.setPosition(cw / 2 - 42, groundY);
                this.player.play('happy_dance');
                this.bride.visible = true;
                this.setBrideStyle(false);
                this.bride.setPosition(cw / 2 + 42, groundY);
                this.bride.play(rx === 'champagne_toast' || rx === 'taichi_grandkids' ? 'happy_dance' : 'mom_wave');
                if (rx === 'luxury_villa' || rx === 'red_envelope' || rx === 'doctor_chart' || rx === 'park_stroll' || rx === 'taichi_grandkids') {
                    this.dad.visible = true;
                    this.dad.setPosition(cw / 2 - 175, groundY);
                    this.dad.play('dad_proud');
                    this.mom.visible = true;
                    this.mom.setPosition(cw / 2 + 175, groundY);
                    this.mom.play('mom_wave');
                }
            } else if (rx === 'luxury_couch') {
                this.player.setPosition(cw / 2, groundY);
                this.player.play('cinema_sit');
            } else if (rx === 'sports_car_flex' || rx === 'sedan_drive' || rx === 'executive_suv') {
                this.player.play('sports_car_flex');
            } else if (rx === 'crypto_roulette' || rx === 'exhausted_briefcase' || rx === 'frugal_sad') {
                this.player.play('crying_broke');
            } else if (option.consequence.happiness >= 3) {
                this.player.play('happy_dance');
            } else {
                this.player.play('rich_swagger');
            }
        }

        handlePlayerChoice(option, milestone) {
            this.gameState.choiceHistory.push({
                age: milestone.age,
                optionId: option.id,
                label: option.label
            });

            if (option.protectionGrant) {
                for (const [k, v] of Object.entries(option.protectionGrant)) {
                    this.gameState.addProtection(k, v);
                }
            }

            // Switch immediately into Full-Stage Visual Cutscene + Bottom Subtitle Bar
            this.playChoiceCutscene(option, milestone);

            this.ui.showMemoryFlash(option, () => {
                const isStillAlive = this.gameState.applyDelta(
                    option.consequence,
                    `${milestone.title} (Option ${option.id})`
                );

                if (!isStillAlive) return;

                const randomEvent = this.randomEventManager.checkForRandomEvent(milestone.age);
                if (randomEvent) {
                    this.triggerDisasterSequence(randomEvent, () => {
                        this.proceedNextMilestone();
                    });
                } else {
                    this.proceedNextMilestone();
                }
            });
        }

        triggerDisasterSequence(randomEvent, onComplete) {
            this.inCutscene = true;
            this.ui.setCutsceneMode(true);
            this.syncRendererGroundOffset();
            const id = randomEvent.id;

            this.dad.visible = false;
            this.mom.visible = false;
            this.friend.visible = false;
            this.bride.visible = false;
            this.player.visible = true;
            this.player.setPosition(this.canvas.width / 2, this.renderer.getGroundY());

            if (id.includes('road_accident')) {
                this.currentSceneType = 'car_crash';
                this.player.play('car_crash_accordion');
            } else if (id.includes('flooding')) {
                this.currentSceneType = 'flood';
                this.player.play('shocked');
            } else if (id.includes('surgery') || id.includes('illness')) {
                this.currentSceneType = 'hospital';
                this.player.play('hospital_bed');
            } else if (id.includes('disability')) {
                this.currentSceneType = 'disability';
                this.player.play('wheelchair_sad');
            } else if (id.includes('breadwinner') || id.includes('death')) {
                this.currentSceneType = 'cemetery';
                this.player.play('gravestone_mourn');
            } else {
                this.player.play('crying_broke');
            }

            const evaluation = this.randomEventManager.evaluateEvent(randomEvent);
            const isProtected = Boolean(evaluation.protectionUsed && !/\bno\b|excluded/i.test(evaluation.protectionUsed));

            if (isProtected) {
                this.renderer.triggerShieldEffect();
                this.sound.playSuccessChime();
            } else {
                if (id.includes('road_accident')) {
                    this.sound.playCarZoom();
                    setTimeout(() => {
                        if (this.inCutscene && this.gameState.isAlive) {
                            this.sound.playFailSlam();
                        }
                    }, 450);
                } else if (id.includes('flooding')) {
                    this.sound.playSplash();
                    setTimeout(() => {
                        if (this.inCutscene && this.gameState.isAlive) {
                            this.sound.playFailSlam();
                        }
                    }, 280);
                } else {
                    this.sound.playFailSlam();
                }
            }

            this.ui.showDisasterModal(randomEvent, evaluation, () => {
                const alive = this.randomEventManager.applyEventConsequence(randomEvent, evaluation);
                if (alive) {
                    onComplete();
                }
            });
        }

        proceedNextMilestone() {
            this.currentMilestoneIndex++;
            this.loadMilestone(this.currentMilestoneIndex);
        }

        loop(currentTime) {
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            for (const char of this.characters) {
                char.update(deltaTime);
            }

            this.renderer.renderScene(this.currentSceneType, this.characters, this.particles);

            requestAnimationFrame((t) => this.loop(t));
        }
    }

    /* ==========================================================================
       10. Auto-Boot
       ========================================================================== */
    function boot() {
        new GameApp();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
