const imageUpload = document.getElementById('imageUpload');
const previewImage = document.getElementById('previewImage');
const promptInput = document.getElementById('promptInput');
const generateButton = document.getElementById('generateButton');
const generatedImage = document.getElementById('generatedImage');
const loadingMessage = document.getElementById('loadingMessage');
const pasteImageUrl = document.getElementById('pasteImageUrl');
const microphoneIcon = document.getElementById('microphoneIcon');
const downloadOutputIcon = document.getElementById('downloadOutputIcon');
const obfuscatePlateIcon = document.getElementById('obfuscatePlateIcon');
const saveIndividualIcon = document.getElementById('saveIndividualIcon');
const saveGalleryIcon = document.getElementById('saveGalleryIcon');
const repassDictationIcon = document.getElementById('repassDictationIcon');
const repassDetailsOutput = document.getElementById('repassDetailsOutput');
const repassText = document.getElementById('repassText');

let currentInputImageSource = null;
let dragCounter = 0; // Counter for global dragenter/dragleave events
let isPlateObfuscationActive = false; // State for vehicle plate masking

// Function to update the preview and the source variable
function updateInputImage(source) {
    currentInputImageSource = source;
    if (source) {
        previewImage.src = source;
        previewImage.style.display = 'block';
    } else {
        previewImage.src = '#';
        previewImage.style.display = 'none';
    }
}

// Clear all input methods (file input, URL input, and current image source)
function clearAllInputMethods() {
    imageUpload.value = null; // Clear file input
    pasteImageUrl.value = ''; // Clear URL input
    updateInputImage(null); // Clear preview and source
}

imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            clearAllInputMethods();
            updateInputImage(e.target.result); // e.target.result is a Data URL
        };
        reader.readAsDataURL(file);
    } else {
        // If file input is cleared without selecting a file, also clear others if no active source
        if (!currentInputImageSource) { // Only clear if no other source is active
            clearAllInputMethods();
        }
    }
});

pasteImageUrl.addEventListener('input', () => {
    const url = pasteImageUrl.value.trim();
    if (url) {
        // Basic URL validation
        if (url.startsWith('http://') || url.startsWith('https://')) {
            clearAllInputMethods();
            pasteImageUrl.value = url; // Ensure the input field retains the valid URL
            updateInputImage(url); // URL is passed directly
        } else {
            // If the user types an invalid URL, clear the preview but keep the text
            updateInputImage(null);
        }
    } else {
        updateInputImage(null);
    }
});

// --- GLOBAL DRAG AND DROP FUNCTIONALITY (applies to the whole page) ---
document.body.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dragCounter++;
    if (dragCounter === 1) { // Only add class on the first actual dragenter (entering from outside the window)
        document.body.classList.add('drag-over-global');
    }
});

document.body.addEventListener('dragleave', (event) => {
    // Only decrement if moving to a non-child element or out of the window
    dragCounter--;
    if (dragCounter === 0) {
        document.body.classList.remove('drag-over-global');
    }
});

document.body.addEventListener('dragover', (event) => {
    event.preventDefault(); // Essential to allow drop
});

document.body.addEventListener('drop', (event) => {
    event.preventDefault();
    dragCounter = 0; // Reset counter on drop
    document.body.classList.remove('drag-over-global');

    clearAllInputMethods(); // Clear existing inputs

    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            updateInputImage(e.target.result); // e.target.result is a Data URL
        };
        reader.readAsDataURL(file);
    }
    // If no files, or not an image file, then nothing happens, inputs remain cleared.
});

// --- GLOBAL PASTE FUNCTIONALITY (applies to the whole page) ---
document.body.addEventListener('paste', async (event) => {
    event.preventDefault(); // Prevent default paste behavior
    clearAllInputMethods();

    // Check for image files in clipboard
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    updateInputImage(e.target.result); // e.target.result is a Data URL
                };
                reader.readAsDataURL(file);
                return; // Only process the first image found
            }
        }
    }

    // Check for text (URL) in clipboard. This handles pasting image URLs anywhere on the page,
    // populating the URL input field and updating the preview, similar to dragging an image.
    const text = event.clipboardData.getData('text');
    if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        pasteImageUrl.value = text;
        updateInputImage(text); // URL is passed directly
    }
    // If neither file nor valid URL, then nothing happens, all inputs remain cleared.
});

// Function to convert a URL to a Data URL (for websim.imageGen)
async function urlToDataUrl(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// --- NEW FUNCTIONALITY IMPLEMENTATION ---

// 1. Voice Recognition (Microphone Icon for Prompt)
microphoneIcon.addEventListener('click', () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Setting language to Portuguese (pt-BR) based on prompt language context
        recognition.lang = 'pt-BR'; 
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.start();
        microphoneIcon.classList.add('recording'); // Add visual feedback

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            promptInput.value = transcript;
            microphoneIcon.classList.remove('recording');
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            alert(`Erro no reconhecimento de voz: ${event.error}`);
            microphoneIcon.classList.remove('recording');
        };
        
        recognition.onend = () => {
            microphoneIcon.classList.remove('recording');
        };

    } else {
        alert('Seu navegador não suporta reconhecimento de voz. Por favor, digite o prompt.');
    }
});

// 2. License Plate Obfuscation Toggle
obfuscatePlateIcon.addEventListener('click', () => {
    isPlateObfuscationActive = !isPlateObfuscationActive;
    obfuscatePlateIcon.classList.toggle('active', isPlateObfuscationActive);
    
    if (isPlateObfuscationActive) {
        alert('Modo "Ocultar Placa de Veículos" ativado. A AI tentará remover ou borrar placas de veículos na imagem gerada.');
    } else {
        alert('Modo "Ocultar Placa de Veículos" desativado.');
    }
});


// 3. Save Actions
// Helper function for downloading data URL
function downloadDataUrl(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Handle output download functionality on the new icon in the URL bar (Download Output Icon)
downloadOutputIcon.addEventListener('click', () => {
    if (generatedImage.style.display !== 'block' || !generatedImage.src || generatedImage.src === '#') {
        alert('Nenhuma imagem gerada para salvar.');
        return;
    }
    
    // Attempt to download the generated image.
    downloadDataUrl(generatedImage.src, 'ai_edited_image.png');
});

// Handle Save Individual (Image Icon)
saveIndividualIcon.addEventListener('click', () => {
    if (generatedImage.style.display !== 'block' || !generatedImage.src || generatedImage.src === '#') {
        alert('Nenhuma imagem gerada para salvar.');
        return;
    }
    
    // Attempt to download the generated image.
    downloadDataUrl(generatedImage.src, 'ai_edited_image.png');
});

// Handle Save Gallery (Images Icon)
saveGalleryIcon.addEventListener('click', () => {
    // Placeholder for complex gallery generation/saving, as requested by the user.
    alert('A funcionalidade de "Salvar Galeria Organizada" está em desenvolvimento para agrupar múltiplas imagens editadas.');
});


// 4. Repass Dictation Functionality (LLM powered)
repassDictationIcon.addEventListener('click', () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'pt-BR'; 
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.start();
        repassDictationIcon.classList.add('recording');

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            repassDictationIcon.classList.remove('recording');
            
            repassText.textContent = `Aguardando análise da AI sobre: "${transcript}"...`;
            repassDetailsOutput.style.display = 'block';

            await generateRepassDetails(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            alert(`Erro no reconhecimento de voz para detalhes de repasse: ${event.error}`);
            repassDictationIcon.classList.remove('recording');
            repassDetailsOutput.style.display = 'none';
        };
        
        recognition.onend = () => {
            repassDictationIcon.classList.remove('recording');
        };

    } else {
        alert('Seu navegador não suporta reconhecimento de voz. Por favor, use um prompt de texto manual se necessário.');
    }
});

async function generateRepassDetails(transcript) {
    const loadingStartTime = Date.now();

    try {
        const systemPrompt = `Você é um assistente especialista em criação de anúncios de veículos usados. Analise o texto fornecido pelo usuário (que descreve o veículo para repasse) e estruture as informações de forma clara, profissional e atraente. Gere uma resposta em formato JSON estrito.
        
        SCHEMA:
        {
          "titulo": "string, título chamativo para o anúncio",
          "modelo_ano": "string, Ex: Honda Civic 2018/2019",
          "descricao_sumario": "string, resumo dos pontos fortes",
          "lista_detalhes": ["string", "string", "lista de 5 a 8 características importantes (Ex: Quilometragem baixa, Teto solar, Pneus novos, Manutenção em dia)"],
          "preco": "string, sugestão de preço ou 'A consultar'",
          "contato": "string, Mensagem padrão de contato"
        }
        
        Sua saída deve ser APENAS o objeto JSON.`;

        const completion = await websim.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Detalhes ditados: ${transcript}` },
            ],
            json: true,
        });

        const jsonResult = JSON.parse(completion.content);
        
        let outputText = `--- ${jsonResult.titulo} ---\n\n`;
        outputText += `Modelo/Ano: ${jsonResult.modelo_ano}\n\n`;
        outputText += `Sumário: ${jsonResult.descricao_sumario}\n\n`;
        outputText += `Características Principais:\n- ${jsonResult.lista_detalhes.join('\n- ')}\n\n`;
        outputText += `Preço: ${jsonResult.preco}\n\n`;
        outputText += `Contato: ${jsonResult.contato}`;

        repassText.textContent = outputText;

    } catch (error) {
        console.error('Error generating repass details:', error);
        repassText.textContent = 'Erro ao gerar detalhes do repasse. Certifique-se de que a descrição foi clara e tente novamente.';
    }
    // Ensure loading time visibility if quick
    const elapsed = Date.now() - loadingStartTime;
    if (elapsed < 1000) {
        await new Promise(r => setTimeout(r, 1000 - elapsed));
    }
}


generateButton.addEventListener('click', async () => {
    let prompt = promptInput.value.trim();

    if (!currentInputImageSource) {
        alert('Por favor, carregue ou cole uma imagem primeiro.');
        return;
    }

    if (!prompt) {
        alert('Por favor, insira um prompt.');
        return;
    }

    // Adjust prompt if plate obfuscation is active (to enforce high realism and detail as requested)
    if (isPlateObfuscationActive) {
        // Explicitly instruct the AI model to perform the required protective action.
        prompt = prompt + ". IMPORTANT: Ensure all vehicle license plates in the image are perfectly obscured, blurred, or removed, while maintaining high realism, shadow precision, and tone standardization.";
    }


    generateButton.disabled = true;
    loadingMessage.style.display = 'block';
    generatedImage.style.display = 'none';

    try {
        // Call websim.imageGen with the uploaded image and prompt
        const result = await websim.imageGen({
            prompt: prompt,
            image_inputs: [
                {
                    url: currentInputImageSource,
                },
            ],
            // Adding a request for high quality based on user requirement for perfection, realism, and detail.
            model_options: {
                quality: "high"
            }
        });

        if (result && result.url) {
            generatedImage.src = result.url;
            generatedImage.style.display = 'block';
        } else {
            alert('Falha ao gerar imagem. Nenhuma URL retornada.');
        }

    } catch (error) {
        console.error('Error generating image:', error);
        alert('Ocorreu um erro durante a geração da imagem. Por favor, tente novamente.');
    } finally {
        generateButton.disabled = false;
        loadingMessage.style.display = 'none';
    }
});