function openToolModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeToolModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal when clicking outside
document.querySelectorAll('.tool-modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });
});

// Close modal with ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.tool-modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});
