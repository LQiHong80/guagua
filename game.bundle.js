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
                drawSceneBanner('#334155', '#1e293b');
                drawGround('#475569', '#0f172a');
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
                drawSceneBanner('#fef3c7', '#f1f5f9');
                drawGround('#cbd5e1', '#64748b');
                const shakeY = Math.sin(t * 28) * 3;
                const cx = cw / 2 - 40;
                ctx.fillStyle = '#65a30d';
                ctx.strokeStyle = '#365314';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.roundRect(cx - 130, groundY - 72 + shakeY, 220, 56, 10);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.arc(cx - 75, groundY - 12, 20, 0, Math.PI * 2);
                ctx.arc(cx + 45, groundY - 12, 20, 0, Math.PI * 2);
                ctx.fill();
                ctx.font = '26px sans-serif';
                ctx.fillText('💨🔩', cx - 190, groundY - 40 + shakeY);
                drawPropBubble(cw / 2 + 170, groundY - 120, '💵💰', 1.3, '#dcfce7', '#16a34a');

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
                drawSceneBanner('#fdf2f8', '#fbcfe8');
                drawGround('#fce7f3', '#db2777');
                // Grand 5-Star Crystal Arch + Drone + Fireworks
                const gx = cw / 2;
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.arc(gx, groundY, 155, Math.PI, 0);
                ctx.stroke();
                ctx.font = '28px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('👑 🎆 💎 🎆 👑', gx, groundY - 170);
                ctx.textAlign = 'left';
                // Camera Drone flying top-left & Giant Invoice on right
                drawPropBubble(gx - 210, groundY - 165, '🚁📸', 1.15, '#e0f2fe', '#0284c7');
                drawPropBubble(gx + 215, groundY - 130, '🧾💸', 1.3, '#fee2e2', '#dc2626');

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
                // Aurora Borealis & Snow-Capped Alps Mountains
                drawSceneBanner('#0f172a', '#064e3b');
                drawGround('#f8fafc', '#94a3b8');
                // Shimmering Green Aurora Waves
                ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
                ctx.lineWidth = 14;
                ctx.beginPath();
                ctx.moveTo(0, 75);
                ctx.bezierCurveTo(cw * 0.3, 25 + Math.sin(t * 2) * 20, cw * 0.7, 115 - Math.sin(t * 2) * 20, cw, 55);
                ctx.stroke();
                // Snow Alps Peaks
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.moveTo(cw / 2 - 280, groundY);
                ctx.lineTo(cw / 2 - 160, groundY - 150);
                ctx.lineTo(cw / 2 - 40, groundY);
                ctx.moveTo(cw / 2 + 40, groundY);
                ctx.lineTo(cw / 2 + 170, groundY - 165);
                ctx.lineTo(cw / 2 + 300, groundY);
                ctx.fill();
                drawPropBubble(cw / 2, groundY - 165, '✈️🌍', 1.2, '#e0f2fe', '#0284c7');

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
                drawSceneBanner('#e0f2fe', '#f1f5f9');
                drawGround('#cbd5e1', '#64748b');
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#0284c7';
                ctx.lineWidth = 4;
                ctx.fillRect(cw / 2 - 95, groundY - 135, 190, 135);
                ctx.strokeRect(cw / 2 - 95, groundY - 135, 190, 135);
                drawPropBubble(cw / 2 - 155, groundY - 120, '🏢✨', 1.15, '#e0f2fe', '#0284c7');
                drawPropBubble(cw / 2 + 160, groundY - 120, '💰🛡️', 1.3, '#dcfce7', '#16a34a');

            } else if (sceneType === 'stock_ticker') {
                drawSceneBanner('#ecfdf5', '#d1fae5');
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
                drawSceneBanner('#1e1b4b', '#312e81');
                drawGround('#4c1d95', '#7c3aed');
                // 85-inch Laser Home Theater Screen
                ctx.fillStyle = '#38bdf8';
                ctx.strokeStyle = '#f8fafc';
                ctx.lineWidth = 5;
                ctx.fillRect(cw / 2 - 180, 30, 360, 115);
                ctx.strokeRect(cw / 2 - 180, 30, 360, 115);
                ctx.font = '36px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🎬 85" LASER CINEMA 🔊', cw / 2, 98);
                ctx.textAlign = 'left';
                // Italian Leather Sofa
                ctx.fillStyle = '#991b1b';
                ctx.beginPath();
                ctx.roundRect(cw / 2 - 130, groundY - 55, 260, 50, 14);
                ctx.fill();
                drawPropBubble(cw / 2 + 195, groundY - 120, '🛋️💸', 1.25, '#fee2e2', '#dc2626');

            } else if (sceneType === 'executive_suv') {
                drawSceneBanner('#e2e8f0', '#cbd5e1');
                drawGround('#334155', '#0f172a');
                const cx = cw / 2;
                // German Luxury Black SUV
                ctx.fillStyle = '#18181b';
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.roundRect(cx - 175, groundY - 95, 350, 80, 16);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#475569';
                ctx.beginPath();
                ctx.arc(cx - 105, groundY - 14, 26, 0, Math.PI * 2);
                ctx.arc(cx + 105, groundY - 14, 26, 0, Math.PI * 2);
                ctx.fill();
                drawPropBubble(cx - 210, groundY - 140, '🚘🛡️', 1.25, '#fef08a', '#ca8a04');
                drawPropBubble(cx + 210, groundY - 140, '💸', 1.2, '#fee2e2', '#dc2626');

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
                drawGround('#cbd5e1', '#475569');
                const planeX = (t * 95) % cw;
                ctx.font = '40px sans-serif';
                ctx.fillText('✈️', planeX, 75);
                drawPropBubble(cw / 2 - 150, groundY - 130, '🧳🎓', 1.25, '#e0f2fe', '#0284c7');
                drawPropBubble(cw / 2 + 165, groundY - 130, '🏦💸', 1.3, '#fee2e2', '#dc2626');

            } else if (sceneType === 'bank_transfer') {
                drawSceneBanner('#dcfce7', '#e0f2fe');
                drawGround('#cbd5e1', '#16a34a');
                drawPropBubble(cw / 2 - 150, groundY - 130, '🏦🪙', 1.3, '#fef08a', '#16a34a');
                drawPropBubble(cw / 2 + 150, groundY - 130, '🎓🏛️', 1.3, '#e0f2fe', '#0284c7');

            } else if (sceneType === 'scholarship_scroll') {
                drawSceneBanner('#fef9c3', '#fde047');
                drawGround('#cbd5e1', '#ca8a04');
                drawPropBubble(cw / 2, groundY - 165, '🏆📜', 1.4, '#fef08a', '#ca8a04');

            } else if (sceneType === 'local_campus') {
                drawSceneBanner('#e0e7ff', '#dcfce7');
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
                drawGround('#475569', '#1e293b');
                const cx = cw / 2 - 120;
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.moveTo(cx - 120, groundY - 30);
                ctx.lineTo(cx - 80, groundY - 70);
                ctx.lineTo(cx + 20, groundY - 60);
                ctx.lineTo(cx + 40, groundY - 40);
                ctx.lineTo(cx + 30, groundY - 50);
                ctx.lineTo(cx + 50, groundY - 20);
                ctx.lineTo(cx - 120, groundY - 10);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#facc15';
                ctx.font = 'bold 32px sans-serif';
                ctx.fillText('💥 CRASH!', cw / 2 - 80, groundY - 120);

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
