const axios = require('axios');
const alternativesEngine = require('./alternativesEngine');
const insightsGenerator = require('./insightsGenerator');
class ConversationalAI {
    constructor() {
        this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
        this.deepseekEndpoint = 'https://api.deepseek.com/v1/chat/completions';
        this.conversationHistory = new Map(); // Cache des conversations par session
        this.maxHistoryLength = 10; // Limiter l'historique pour éviter tokens overflow
    }
    /**
     * Traite une question utilisateur dans le contexte d'un produit
     * @param {string} userMessage - Message de l'utilisateur
     * @param {Object} productContext - Contexte du produit analysé
     * @param {Object} userProfile - Profil utilisateur
     * @param {string} sessionId - ID de session pour historique
     * @returns {Object} Réponse structurée avec message et suggestions
     */
    async processUserQuestion(userMessage, productContext, userProfile = {}, sessionId = 'default') {
        try {
            // Construire le contexte complet
            const fullContext = await this.buildConversationContext(productContext, userProfile, sessionId);
            // Créer le prompt pour DeepSeek
            const prompt = this.createChatPrompt(userMessage, fullContext, userProfile);
            // Appel à DeepSeek
            const aiResponse = await this.callDeepSeekAPI(prompt);
            // Post-traiter la réponse
            const processedResponse = this.processAIResponse(aiResponse, productContext, userProfile);
            // Sauvegarder dans l'historique
            this.updateConversationHistory(sessionId, userMessage, processedResponse.message);
            // Générer suggestions de questions suivantes
            const suggestions = this.generateFollowUpQuestions(userMessage, productContext, userProfile);
            return {
                message: processedResponse.message,
                sources: processedResponse.sources,
                alternatives_mentioned: processedResponse.alternatives,
                follow_up_questions: suggestions,
                confidence: processedResponse.confidence,
                response_type: processedResponse.type
            };
        }
        catch (error) {
            console.error('Error in conversational AI:', error);
            return this.getFallbackResponse(userMessage, productContext);
        }
    }
    /**
     * Construit le contexte complet pour la conversation
     */
    async buildConversationContext(productContext, userProfile, sessionId) {
        const context = {
            product: {
                name: productContext.name || 'Produit analysé',
                score: productContext.score || 0,
                grade: productContext.grade || 'N/A',
                issues: this.extractProductIssues(productContext),
                ingredients: productContext.ingredients || [],
                breakdown: productContext.breakdown || {}
            },
            user: {
                preferences: userProfile.preferences || [],
                dietary_restrictions: userProfile.dietary_restrictions || [],
                health_goals: userProfile.health_goals || [],
                experience_level: userProfile.experience_level || 'débutant'
            },
            conversation_history: this.getConversationHistory(sessionId),
            available_data: {
                alternatives: true,
                scientific_insights: true,
                nutritional_data: true,
                environmental_impact: true
            }
        };
        // Enrichir avec alternatives et insights si pertinent
        try {
            const alternatives = await alternativesEngine.getAlternativesForProduct(productContext, userProfile);
            const insights = await insightsGenerator.getInsightsForProduct(productContext, userProfile);
            context.available_alternatives = alternatives.slice(0, 3); // Top 3
            context.key_insights = insights.slice(0, 2); // Top 2
        }
        catch (error) {
            console.log('Could not enrich context with alternatives/insights:', error.message);
        }
        return context;
    }
    /**
     * Crée le prompt pour DeepSeek avec contexte et règles
     */
    createChatPrompt(userMessage, context, userProfile) {
        return `Tu es l'assistant IA d'ECOLOJIA, expert en nutrition scientifique et consommation responsable.

CONTEXTE PRODUIT ANALYSÉ:
- Nom: ${context.product.name}
- Score ECOLOJIA: ${context.product.score}/100 (Grade ${context.product.grade})
- Problèmes détectés: ${context.product.issues.join(', ') || 'Aucun problème majeur'}
- Classification NOVA: ${context.product.breakdown.transformation?.novaGroup || 'Non déterminé'}
- Nutri-Score: ${context.product.breakdown.nutrition?.nutriScore?.grade || 'Non calculé'}

ALTERNATIVES DISPONIBLES:
${context.available_alternatives ? context.available_alternatives.map(alt => `- ${alt.name}: ${alt.why_better}`).join('\n') : 'Aucune alternative chargée'}

INSIGHTS SCIENTIFIQUES PERTINENTS:
${context.key_insights ? context.key_insights.map(insight => `- ${insight.title}: ${insight.fact} (Source: ${insight.source})`).join('\n') : 'Aucun insight chargé'}

PROFIL UTILISATEUR:
- Niveau: ${context.user.experience_level}
- Objectifs santé: ${context.user.health_goals.join(', ') || 'Non spécifiés'}
- Restrictions alimentaires: ${context.user.dietary_restrictions.join(', ') || 'Aucune'}

HISTORIQUE CONVERSATION:
${context.conversation_history.map(entry => `Utilisateur: ${entry.user}\nAssistant: ${entry.assistant}`).join('\n---\n')}

QUESTION UTILISATEUR: "${userMessage}"

RÈGLES ABSOLUES:
1. JAMAIS critiquer une marque directement ("Nutella est mauvais" → INTERDIT)
2. TOUJOURS citer des sources officielles (ANSES, EFSA, INSERM, études peer-reviewed)
3. RESTER FACTUEL: "Selon l'ANSES..." / "Les études montrent..." / "Classification NOVA indique..."
4. PROPOSER solutions constructives, pas seulement critiquer
5. ADAPTER le niveau de détail selon l'expérience utilisateur
6. INCLURE disclaimer si conseil santé: "Consulter professionnel santé qualifié"

FORMAT RÉPONSE:
- Réponse naturelle et empathique
- Maximum 200 mots pour éviter information overload  
- Citer 1-2 sources max par réponse
- Mentionner alternatives pertinentes si applicable
- Terminer par question ouverte pour engagement

EXEMPLES FORMULATIONS AUTORISÉES:
✅ "Ce produit contient des émulsifiants (E471) qui selon l'EFSA peuvent impacter le microbiote"
✅ "Classification NOVA niveau 4 d'après l'INSERM signifie ultra-transformé"  
✅ "Les études montrent que ce type d'additif..."
✅ "Une alternative plus naturelle serait..."

EXEMPLES INTERDITS:
❌ "Cette marque est mauvaise"
❌ "N'achetez jamais ce produit"  
❌ "C'est toxique" (sauf citation exacte étude)
❌ "Je recommande" → utiliser "Les données suggèrent"

Réponds maintenant à la question en respectant ces règles:`;
    }
    /**
     * Appel à l'API DeepSeek
     */
    async callDeepSeekAPI(prompt) {
        if (!this.deepseekApiKey) {
            throw new Error('DeepSeek API key not configured');
        }
        const response = await axios.post(this.deepseekEndpoint, {
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: 'Tu es un assistant expert en nutrition scientifique, neutre et factuel. Tu INFORMES basé sur la science officielle, tu ne JUGES jamais.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 400, // Limiter pour réponses concises
            temperature: 0.3, // Faible créativité pour rester factuel
            stream: false
        }, {
            headers: {
                'Authorization': `Bearer ${this.deepseekApiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        return response.data.choices[0].message.content;
    }
    /**
     * Post-traite la réponse de l'IA
     */
    processAIResponse(rawResponse, productContext, userProfile) {
        // Extraire les sources mentionnées
        const sources = this.extractSources(rawResponse);
        // Détecter les alternatives mentionnées
        const alternatives = this.extractMentionedAlternatives(rawResponse);
        // Évaluer la confiance de la réponse
        const confidence = this.evaluateResponseConfidence(rawResponse, sources);
        // Détecter le type de réponse
        const responseType = this.classifyResponseType(rawResponse);
        // Nettoyer et formater le message
        const cleanMessage = this.cleanResponseMessage(rawResponse);
        return {
            message: cleanMessage,
            sources,
            alternatives,
            confidence,
            type: responseType
        };
    }
    /**
     * Extrait les sources scientifiques de la réponse
     */
    extractSources(response) {
        const sources = [];
        const sourcePatterns = [
            /ANSES[^.]*(?:\.|$)/gi,
            /EFSA[^.]*(?:\.|$)/gi,
            /INSERM[^.]*(?:\.|$)/gi,
            /OMS[^.]*(?:\.|$)/gi,
            /WHO[^.]*(?:\.|$)/gi,
            /selon.*?(?:20\d{2})[^.]*(?:\.|$)/gi,
            /étude.*?(?:20\d{2})[^.]*(?:\.|$)/gi
        ];
        sourcePatterns.forEach(pattern => {
            const matches = response.match(pattern);
            if (matches) {
                sources.push(...matches.map(match => match.trim()));
            }
        });
        return [...new Set(sources)]; // Déduplication
    }
    /**
     * Extrait les alternatives mentionnées
     */
    extractMentionedAlternatives(response) {
        const alternatives = [];
        // Patterns pour détecter mentions d'alternatives
        const alternativePatterns = [
            /alternative.*?serait.*?([^.]+)/gi,
            /mieux.*?([^.]+)/gi,
            /privilégier.*?([^.]+)/gi,
            /remplacer.*?par.*?([^.]+)/gi
        ];
        alternativePatterns.forEach(pattern => {
            const matches = response.match(pattern);
            if (matches) {
                alternatives.push(...matches.map(match => match.trim()));
            }
        });
        return alternatives.slice(0, 2); // Max 2 alternatives
    }
    /**
     * Évalue la confiance de la réponse
     */
    evaluateResponseConfidence(response, sources) {
        let confidence = 'medium';
        // Haute confiance si sources officielles citées
        if (sources.some(source => /ANSES|EFSA|INSERM|OMS/.test(source))) {
            confidence = 'high';
        }
        // Basse confiance si pas de sources ou formulations vagues
        if (sources.length === 0 || /peut-être|possiblement|probablement/.test(response)) {
            confidence = 'low';
        }
        return confidence;
    }
    /**
     * Classifie le type de réponse
     */
    classifyResponseType(response) {
        if (/recette|préparation|étapes/.test(response.toLowerCase())) {
            return 'recipe';
        }
        if (/alternative|remplacer|mieux/.test(response.toLowerCase())) {
            return 'alternative_suggestion';
        }
        if (/étude|recherche|selon|ANSES|EFSA/.test(response)) {
            return 'scientific_explanation';
        }
        if (/santé|corps|impact|effet/.test(response.toLowerCase())) {
            return 'health_information';
        }
        return 'general_information';
    }
    /**
     * Nettoie et formate le message de réponse
     */
    cleanResponseMessage(response) {
        // Supprimer les références internes au prompt
        let cleaned = response.replace(/CONTEXTE PRODUIT|RÈGLES ABSOLUES|FORMAT RÉPONSE/gi, '');
        // Limiter la longueur si nécessaire
        if (cleaned.length > 600) {
            cleaned = cleaned.substring(0, 600) + '...';
        }
        // S'assurer qu'il se termine par une ponctuation
        if (!/[.!?]$/.test(cleaned.trim())) {
            cleaned += '.';
        }
        return cleaned.trim();
    }
    /**
     * Génère des questions de suivi pertinentes
     */
    generateFollowUpQuestions(userMessage, productContext, userProfile) {
        const questions = [];
        // Questions basées sur le contexte du produit
        if (productContext.breakdown?.transformation?.novaGroup === 4) {
            questions.push("Comment éviter les produits ultra-transformés au quotidien ?");
        }
        if (productContext.breakdown?.glycemic?.estimatedGI > 70) {
            questions.push("Comment réduire l'impact glycémique de mes repas ?");
        }
        if (productContext.alternatives && productContext.alternatives.length > 0) {
            questions.push("Peux-tu me donner la recette de l'alternative maison ?");
        }
        // Questions générales pertinentes
        const generalQuestions = [
            "Comment lire correctement une étiquette alimentaire ?",
            "Quels sont les additifs les plus problématiques à éviter ?",
            "Comment faire ses courses de manière plus responsable ?",
            "Quelle est la différence entre bio et naturel ?"
        ];
        // Ajouter 2-3 questions générales si pas assez de questions spécifiques
        while (questions.length < 4 && generalQuestions.length > 0) {
            const randomIndex = Math.floor(Math.random() * generalQuestions.length);
            questions.push(generalQuestions.splice(randomIndex, 1)[0]);
        }
        return questions.slice(0, 3); // Maximum 3 suggestions
    }
    /**
     * Gestion de l'historique de conversation
     */
    updateConversationHistory(sessionId, userMessage, assistantResponse) {
        if (!this.conversationHistory.has(sessionId)) {
            this.conversationHistory.set(sessionId, []);
        }
        const history = this.conversationHistory.get(sessionId);
        history.push({
            user: userMessage,
            assistant: assistantResponse,
            timestamp: new Date().toISOString()
        });
        // Limiter la taille de l'historique
        if (history.length > this.maxHistoryLength) {
            history.shift(); // Supprimer le plus ancien
        }
    }
    getConversationHistory(sessionId) {
        return this.conversationHistory.get(sessionId) || [];
    }
    clearConversationHistory(sessionId) {
        this.conversationHistory.delete(sessionId);
    }
    /**
     * Extrait les problèmes du produit pour le contexte
     */
    extractProductIssues(productContext) {
        const issues = [];
        if (productContext.breakdown?.transformation?.novaGroup === 4) {
            issues.push('Ultra-transformé (NOVA 4)');
        }
        if (productContext.breakdown?.glycemic?.estimatedGI > 70) {
            issues.push('Index glycémique élevé');
        }
        if (['D', 'E'].includes(productContext.breakdown?.nutrition?.nutriScore?.grade)) {
            issues.push('Nutri-Score médiocre');
        }
        if (productContext.ingredients && productContext.ingredients.length > 10) {
            issues.push('Formulation complexe');
        }
        return issues;
    }
    /**
     * Réponse de fallback en cas d'erreur
     */
    getFallbackResponse(userMessage, productContext) {
        return {
            message: `Je ne peux pas répondre à cette question pour le moment, mais je peux vous donner quelques informations sur ce produit : il a un score de ${productContext.score || 'N/A'}/100. Pour des questions spécifiques sur la nutrition ou la santé, je recommande de consulter un professionnel qualifié.`,
            sources: [],
            alternatives_mentioned: [],
            follow_up_questions: [
                "Comment ce score est-il calculé ?",
                "Quelles sont les alternatives disponibles ?",
                "Comment améliorer mes choix alimentaires ?"
            ],
            confidence: 'low',
            response_type: 'fallback'
        };
    }
    /**
     * API publique pour questions préformatées courantes
     */
    async getQuickResponse(questionType, productContext, userProfile = {}) {
        const quickQuestions = {
            'how_calculated': 'Comment ce score est-il calculé ?',
            'why_this_score': 'Pourquoi ce produit a-t-il ce score ?',
            'alternatives': 'Quelles sont les alternatives plus saines ?',
            'ingredients_concern': 'Y a-t-il des ingrédients préoccupants ?',
            'healthier_choice': 'Comment faire un choix plus sain ?'
        };
        const question = quickQuestions[questionType];
        if (!question) {
            throw new Error('Question type not supported');
        }
        return this.processUserQuestion(question, productContext, userProfile, 'quick_' + questionType);
    }
    /**
     * Nettoie les ressources (appelé périodiquement)
     */
    cleanup() {
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures
        const now = Date.now();
        for (const [sessionId, history] of this.conversationHistory.entries()) {
            const lastActivity = new Date(history[history.length - 1]?.timestamp || 0).getTime();
            if (now - lastActivity > maxAge) {
                this.conversationHistory.delete(sessionId);
            }
        }
    }
}
module.exports = new ConversationalAI();
