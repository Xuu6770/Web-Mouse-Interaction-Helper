// ==UserScript==
// @name         鼠标点击行为辅助
// @namespace    https://github.com/Xuu6770
// @version      2025-03-01
// @description  监听鼠标左右键事件并予以行为辅助。
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
        alert('强制新标签页打开链接功能已' + (enableOpenLinkInNewTab ? '启用' : '禁用'));
    }

    // 注册菜单命令，动态显示启用/禁用状态
    GM_registerMenuCommand(
        (enableCopyOnRightClick ? '禁用' : '启用') + '右键复制',
        toggleCopyOnRightClick
    );
    GM_registerMenuCommand(
        (enableOpenLinkInNewTab ? '禁用' : '启用') + '强制新标签页打开链接',
        toggleOpenLinkInNewTab
    );

    // 右键复制元素内文本
    function createNotification(message, isSuccess) {
        // 创建提示框元素
        var notification = document.createElement('div');
        notification.textContent = message;

        // 设置样式
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

        // 添加到页面
        document.body.appendChild(notification);

        // 淡入效果
        setTimeout(function() {
            notification.style.opacity = '1';
        }, 100);

        // 2秒后淡出并移除
        setTimeout(function() {
            notification.style.opacity = '0';
            setTimeout(function() {
                document.body.removeChild(notification);
            }, 500);
        }, 2000);
    }

    // 监听右键事件
    document.addEventListener('contextmenu', function(event) {
        // 检查开关状态，未启用则跳过
        if (!enableCopyOnRightClick) return;

        var target = event.target;
        var tagName = target.tagName.toUpperCase();

        // 排除图片和表单类元素
        if (tagName === 'IMG' || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tagName)) {
            return;
        }

        var text = target.textContent.trim();

        // 如果有文本内容，执行复制
        if (text) {
            navigator.clipboard.writeText(text).then(function() {
                // 复制成功，显示绿色提示
                createNotification('文本已复制到剪贴板', true);
            }).catch(function(err) {
                // 复制失败，显示红色提示
                createNotification('复制文本失败', false);
                console.error('复制文本失败: ', err);
            });
        }
    });

    // 左键点击超链接强制以新标签页打开
    document.addEventListener('click', function(event) {
        // 检查开关状态，未启用则跳过
        if (!enableOpenLinkInNewTab) return;

        // 获取被点击的元素
        var target = event.target;

        // 向上查找最近的 <a> 标签
        while (target && target.tagName !== 'A') {
            target = target.parentElement;
        }

        // 如果点击的是 <a> 标签
        if (target && target.tagName === 'A') {
            var href = target.getAttribute('href');

            // 如果 href 为空、或以 javascript: 或 # 开头，则不处理
            if (!href || href.startsWith('javascript:') || href.startsWith('#')) {
                return;
            }

            // 阻止默认行为
            event.preventDefault();

            // 在新标签页打开链接
            window.open(href, '_blank');
        }
    });

})();