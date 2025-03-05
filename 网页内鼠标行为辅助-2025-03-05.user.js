// ==UserScript==
// @name         网页内鼠标行为辅助
// @namespace    https://github.com/Xuu6770
// @version      2025-03-05
// @description  监听鼠标事件并予以相应的辅助行为。
// @author       Aiden Lin
// @match        http://*/*
// @match        https://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // 获取开关状态，默认值为 true
    let enableCopyOnRightClick = GM_getValue('enableCopyOnRightClick', true);
    let enableOpenLinkInNewTab = GM_getValue('enableOpenLinkInNewTab', true);

    // 切换开关状态的函数
    function toggleCopyOnRightClick() {
        enableCopyOnRightClick = !enableCopyOnRightClick;
        GM_setValue('enableCopyOnRightClick', enableCopyOnRightClick);
        alert('右键复制功能已' + (enableCopyOnRightClick ? '启用' : '禁用'));
    }

    function toggleOpenLinkInNewTab() {
        enableOpenLinkInNewTab = !enableOpenLinkInNewTab;
        GM_setValue('enableOpenLinkInNewTab', enableOpenLinkInNewTab);
        alert('左键拖动在新标签页打开功能已' + (enableOpenLinkInNewTab ? '启用' : '禁用'));
    }

    // 注册菜单命令，动态显示启用/禁用状态
    GM_registerMenuCommand(
        (enableCopyOnRightClick ? '禁用' : '启用') + ' 右键复制元素内文本',
        toggleCopyOnRightClick
    );
    GM_registerMenuCommand(
        (enableOpenLinkInNewTab ? '禁用' : '启用') + ' 左键拖动在新标签页打开',
        toggleOpenLinkInNewTab
    );

    // 创建提示框函数
    function createNotification(message, isSuccess) {
        var notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = isSuccess ? 'rgba(0, 128, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.borderRadius = '5px';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        notification.style.zIndex = '10000';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';

        document.body.appendChild(notification);
        setTimeout(function() { notification.style.opacity = '1'; }, 100);
        setTimeout(function() {
            notification.style.opacity = '0';
            setTimeout(function() { document.body.removeChild(notification); }, 500);
        }, 2000);
    }

    // 右键复制元素内文本
    document.addEventListener('contextmenu', function(event) {
        if (!enableCopyOnRightClick) return;

        var target = event.target;
        var tagName = target.tagName.toUpperCase();

        // 排除图片和表单类元素
        if (tagName === 'IMG' || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tagName)) {
            return;
        }

        var text = target.textContent.trim();
        if (text) {
            navigator.clipboard.writeText(text).then(function() {
                createNotification('文本已复制到剪贴板', true);
            }).catch(function(err) {
                createNotification('复制文本失败', false);
                console.error('复制文本失败: ', err);
            });
        }
    });

    // ==============================

    // 拖动超链接或图片在新标签页打开
    let draggedUrl = '';
    let isDraggingLinkOrImage = false;

    // 监听拖动开始
    document.addEventListener('dragstart', function(event) {
        if (!enableOpenLinkInNewTab) return;

        const target = event.target;
        if (target.tagName === 'A' && target.href) {
            draggedUrl = target.href;
            isDraggingLinkOrImage = true;
        } else if (target.tagName === 'IMG' && target.src) {
            draggedUrl = target.src;
            isDraggingLinkOrImage = true;
        }
    });

    // 监听拖动结束
    document.addEventListener('dragend', function(event) {
        if (!enableOpenLinkInNewTab) return;

        if (isDraggingLinkOrImage && event.dataTransfer.dropEffect === 'none') {
            window.open(draggedUrl, '_blank');
        }
        // 重置状态
        isDraggingLinkOrImage = false;
        draggedUrl = '';
    });
})();
