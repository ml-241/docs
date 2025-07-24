// Reusable Rive Animation Integration for Fern Docs
(function() {
    let riveRuntimeLoaded = false;
    let pendingAnimations = [];

    // Main function to create a Rive animation
    function createRiveAnimation(config) {
        const {
            canvasSelector,          // CSS selector for canvas (e.g., '#rive-canvas')
            riveUrl,                 // CDN URL for .riv file
            aspectRatio,             // e.g., 369/93 or 16/9
            stateMachine = "State Machine 1",
            interactiveStates = [],  // e.g., ['Ruby', 'Python', 'TypeScript']
            fallbackImages = [],     // Array of {src, className, alt}
            fit = 'Contain'          // Rive fit mode
        } = config;

        const canvas = document.querySelector(canvasSelector);
        if (!canvas) {
            console.warn(`Canvas not found: ${canvasSelector}`);
            return;
        }

        // Set up container references
        const riveContainer = canvas.parentElement;
        const sdkRiveContainer = riveContainer.parentElement;

        // Load Rive runtime if not already loaded
        if (!riveRuntimeLoaded && typeof rive === 'undefined') {
            pendingAnimations.push(() => createRiveAnimation(config));
            
            if (!document.querySelector('script[src*="@rive-app/canvas"]')) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/@rive-app/canvas@2.7.0';
                script.onload = function() {
                    riveRuntimeLoaded = true;
                    // Process all pending animations
                    pendingAnimations.forEach(fn => fn());
                    pendingAnimations = [];
                };
                document.head.appendChild(script);
            }
            return;
        }

        try {
            // Calculate correct dimensions with high-DPI support
            const rect = riveContainer.getBoundingClientRect();
            
            // Use available width, fallback to a reasonable default if container has no width yet
            const width = rect.width > 0 ? rect.width : 800;
            const height = width / aspectRatio; // Force correct aspect ratio
            
            // Set container dimensions to prevent layout shift
            riveContainer.style.width = width + 'px';
            riveContainer.style.height = height + 'px';
            
            // Also ensure the parent container accommodates the content
            if (sdkRiveContainer) {
                sdkRiveContainer.style.minHeight = height + 'px';
            }
            
            // Force minimum 2x resolution for crispness (even on non-retina displays)
            const dpr = Math.max(window.devicePixelRatio || 1, 2);
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            
            // Set explicit CSS size to prevent stretching
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            canvas.style.display = 'block';
            
            // Create Rive instance
            const r = new rive.Rive({
                src: riveUrl,
                canvas: canvas,
                autoplay: true,
                stateMachines: stateMachine,
                layout: new rive.Layout({
                    fit: rive.Fit[fit],
                    alignment: rive.Alignment.Center
                }),
                shouldDisableRiveListeners: false,
                onLoad: () => {
                    canvas.style.pointerEvents = 'auto';
                    canvas.style.userSelect = 'none';
                    
                    // Add interactive click handling if states are provided
                    if (interactiveStates.length > 0) {
                        setupInteractiveClicks(canvas, r, stateMachine, interactiveStates);
                    }
                },
                onLoadError: (err) => {
                    console.error('Rive load error:', err);
                    
                    showFallbackImages(canvas, fallbackImages);
                }
            });
            
            // Store instance for cleanup
            canvas._riveInstance = r;
            
            // Add resize observer for responsive behavior
            const resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    if (entry.target === riveContainer) {
                        const newWidth = entry.contentRect.width;
                        if (newWidth > 0) {
                            const newHeight = newWidth / aspectRatio;
                            
                            // Update container size
                            riveContainer.style.height = newHeight + 'px';
                            if (sdkRiveContainer) {
                                sdkRiveContainer.style.minHeight = newHeight + 'px';
                            }
                            
                            // Update canvas size
                            const dpr = Math.max(window.devicePixelRatio || 1, 2);
                            canvas.width = newWidth * dpr;
                            canvas.height = newHeight * dpr;
                            canvas.style.width = newWidth + 'px';
                            canvas.style.height = newHeight + 'px';
                            
                            // Resize Rive animation
                            if (r && r.resizeDrawingSurfaceToCanvas) {
                                r.resizeDrawingSurfaceToCanvas();
                            }
                        }
                    }
                }
            });
            
            resizeObserver.observe(riveContainer);
            canvas._resizeObserver = resizeObserver;
            
        } catch (error) {
            console.error('Rive creation error:', error);
            
            showFallbackImages(canvas, fallbackImages);
        }
    }

    // Setup interactive click handling
    function setupInteractiveClicks(canvas, riveInstance, stateMachine, states) {
        canvas.addEventListener('click', () => {
            const inputs = riveInstance.stateMachineInputs(stateMachine);
            
            // Find which hover state is currently active and trigger its click
            for (const state of states) {
                const hoverInput = inputs.find(i => i.name === `${state} Hovered`);
                const clickInput = inputs.find(i => i.name === `${state} Clicked`);
                
                if (hoverInput && hoverInput.value && clickInput) {
                    clickInput.fire();
                    break;
                }
            }
        });
    }

    // Show fallback images when Rive fails to load
    function showFallbackImages(canvas, fallbackImages) {
        if (fallbackImages.length === 0) return;
        
        canvas.style.display = 'none';
        const fallbackContainer = document.createElement('div');
        
        fallbackContainer.innerHTML = fallbackImages.map(img => 
            `<img src="${img.src}" alt="${img.alt}" class="${img.className}" />`
        ).join('');
        
        canvas.parentNode.insertBefore(fallbackContainer, canvas);
    }

    // Initialize predefined animations
    function initializeAnimations() {
        // SDK Animation (your current one)
        createRiveAnimation({
            canvasSelector: '#sdk-rive-canvas',
            riveUrl: 'https://cdn.prod.website-files.com/67880ff570cdb1a85eee946f/68802bc752aef23fab76e6fc_sdk-rive.riv',
            aspectRatio: 369/93,
            stateMachine: "State Machine 1",
            interactiveStates: ['Ruby', 'PHP', 'NET', 'Java', 'GO', 'TypeScript', 'Python'],
            fallbackImages: [
                {
                    src: '/learn/home/images/sdks-preview-light.svg',
                    className: 'sdks-preview-img dark:hidden',
                    alt: 'SDK Generation Preview'
                },
                {
                    src: '/learn/home/images/sdks-preview-dark.svg',
                    className: 'sdks-preview-img hidden dark:block',
                    alt: 'SDK Generation Preview'
                }
            ]
        });

        // Docs Animation
        createRiveAnimation({
            canvasSelector: '#docs-rive-canvas',
            riveUrl: 'https://cdn.prod.website-files.com/67880ff570cdb1a85eee946f/68825994c55f0eece04ce4e2_579220ccfc15555b0fe23088ea2cb9bc_docs_animation.riv',
            aspectRatio: 404/262,
            stateMachine: "State Machine 1",
            interactiveStates: [],
            fallbackImages: [
                {
                    src: '/learn/home/images/docs-preview-light.svg',
                    className: 'docs-preview-img dark:hidden',
                    alt: 'Docs Animation Preview'
                },
                {
                    src: '/learn/home/images/docs-preview-dark.svg',
                    className: 'docs-preview-img hidden dark:block',
                    alt: 'Docs Animation Preview'
                }
            ]
        });

        // AI Animation
        createRiveAnimation({
            canvasSelector: '#ai-rive-canvas',
            riveUrl: 'https://cdn.prod.website-files.com/67880ff570cdb1a85eee946f/68825e97fd6225e1c8a7488c_941db85f022a36b2727f67c219fe3416_ai_animation.riv',
            aspectRatio: 371/99,
            stateMachine: "State Machine 1",
            interactiveStates: [],
            fallbackImages: [
                {
                    src: '/learn/home/images/ai-preview-light.svg',
                    className: 'ai-preview-img dark:hidden',
                    alt: 'AI Animation Preview'
                },
                {
                    src: '/learn/home/images/ai-preview-dark.svg',
                    className: 'ai-preview-img hidden dark:block',
                    alt: 'AI Animation Preview'
                }
            ]
        });

        // Add your other Rive animations here:
        // createRiveAnimation({
        //     canvasSelector: '#docs-rive-canvas',
        //     riveUrl: 'https://your-cdn.com/docs-animation.riv',
        //     aspectRatio: 16/9,
        //     stateMachine: "Main State Machine",
        //     interactiveStates: ['Button1', 'Button2'],
        //     fallbackImages: [...]
        // });
    }

    // Cleanup function to dispose of Rive instances
    function cleanupRiveInstances() {
        document.querySelectorAll('canvas[id$="rive-canvas"]').forEach(canvas => {
            if (canvas._riveInstance) {
                canvas._riveInstance.cleanup();
                canvas._riveInstance = null;
            }
            if (canvas._resizeObserver) {
                canvas._resizeObserver.disconnect();
                canvas._resizeObserver = null;
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAnimations);
    } else {
        initializeAnimations();
    }

    // Re-initialize on navigation changes (for SPA behavior)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            cleanupRiveInstances(); // Clean up before reinitializing
            setTimeout(initializeAnimations, 100);
        }
    }).observe(document, { subtree: true, childList: true });

    // Expose function globally for manual use
    window.createRiveAnimation = createRiveAnimation;
})(); 