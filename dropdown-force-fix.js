// DEBUG FIX - Run this in browser console (F12) to force dropdowns to work
(function forceDropdownFix() {
    console.log('🔧 Applying dropdown force fix...');
    
    // Find all model selects
    const selects = document.querySelectorAll('#model-select-left, #model-select-right, #model-select-direct');
    
    selects.forEach((select, index) => {
        if (!select) return;
        
        console.log(`Fixing select ${index + 1}:`, select.id);
        
        // Force inline styles that ensure clickability
        select.style.cssText = `
            width: 100% !important;
            padding: 12px 16px !important;
            background: rgba(0,0,0,0.8) !important;
            border: 2px solid rgba(255,255,255,0.3) !important;
            border-radius: 12px !important;
            color: white !important;
            font-size: 16px !important;
            cursor: pointer !important;
            color-scheme: dark !important;
            pointer-events: auto !important;
            position: relative !important;
            z-index: 99999 !important;
            opacity: 1 !important;
            display: block !important;
            visibility: visible !important;
            -webkit-appearance: menulist !important;
            appearance: menulist !important;
        `;
        
        // Remove any existing event listeners by cloning
        const parent = select.parentNode;
        const newSelect = select.cloneNode(true);
        parent.replaceChild(newSelect, select);
        
        // Add aggressive click handler
        newSelect.addEventListener('click', function(e) {
            console.log('🖱️ Select clicked:', this.id);
            e.stopPropagation();
            this.focus();
            // Try to force open
            if (typeof this.showPicker === 'function') {
                this.showPicker();
            }
        });
        
        // Handle mousedown aggressively
        newSelect.addEventListener('mousedown', function(e) {
            e.stopPropagation();
            e.preventDefault();
            this.focus();
            // Simulate click after focus
            setTimeout(() => {
                const event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                this.dispatchEvent(event);
            }, 10);
        });
        
        // Monitor changes
        newSelect.addEventListener('change', function(e) {
            console.log('✅ Selection changed:', this.id, '->', this.value);
            // Save to localStorage
            if (this.id === 'model-select-left') {
                localStorage.setItem('battle.model.left', this.value);
            } else if (this.id === 'model-select-right') {
                localStorage.setItem('battle.model.right', this.value);
            } else if (this.id === 'model-select-direct') {
                localStorage.setItem('direct.model', this.value);
            }
        });
        
        console.log(`✅ Fixed select ${index + 1}`);
    });
    
    // Also fix parent containers
    const containers = document.querySelectorAll('.chat-empty, .glass-panel, .model-selector-grid, .model-selector-column');
    containers.forEach(container => {
        if (container) {
            container.style.pointerEvents = 'auto';
        }
    });
    
    console.log('🔧 Dropdown force fix applied! Try clicking the dropdowns now.');
    console.log(`Fixed ${selects.length} select elements`);
})();
