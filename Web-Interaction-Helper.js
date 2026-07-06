// ==UserScript==
// @name         网页交互助手
// @namespace    https://github.com/Xuu6770
// @version      2026-07-06
// @description  监听网页内鼠标行为，提供右键快速复制文本、左键拖拽链接/图片在新标签页打开，快速下载图片/复制图片链接等辅助功能。
// @author       Aiden Lin
// @match        http://*/*
// @match        https://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 用户自定义配置
    // ==========================================

    // 是否默认去除图片 URL 中的参数（例如将 x.jpg?f=webp 还原为 x.jpg，以获得原图）
    // 如果部分网页图片需要鉴权参数（如 token/sign ），可将此项修改为 false
    const STRIP_IMAGE_URL_PARAMS = true;

    // ==========================================
    // 功能开关获取与菜单注册
    // ==========================================

    let enableCopyOnRightClick = GM_getValue('enableCopyOnRightClick', true);
    let enableOpenLinkInNewTab = GM_getValue('enableOpenLinkInNewTab', true);
    let enableImageDownload = GM_getValue('enableImageDownload', true);

    // 切换开关状态的函数
    function toggleCopyOnRightClick() {
        enableCopyOnRightClick = !enableCopyOnRightClick;
        GM_setValue('enableCopyOnRightClick', enableCopyOnRightClick);
    }

    function toggleOpenLinkInNewTab() {
        enableOpenLinkInNewTab = !enableOpenLinkInNewTab;
        GM_setValue('enableOpenLinkInNewTab', enableOpenLinkInNewTab);
    }

    function toggleImageDownload() {
        enableImageDownload = !enableImageDownload;
        GM_setValue('enableImageDownload', enableImageDownload);
    }

    // 注册油猴菜单命令
    GM_registerMenuCommand(
        (enableCopyOnRightClick ? '禁用' : '启用') + ' 右键复制元素内文本',
        toggleCopyOnRightClick
    );
    GM_registerMenuCommand(
        (enableOpenLinkInNewTab ? '禁用' : '启用') + ' 左键拖动在新标签页打开',
        toggleOpenLinkInNewTab
    );
    GM_registerMenuCommand(
        (enableImageDownload ? '禁用' : '启用') + ' 鼠标悬停图片操作面板',
        toggleImageDownload
    );

    // ==========================================
    // 状态栏通知
    // ==========================================

    let activeNotification = null;
    let activeNotificationTimeout1 = null;
    let activeNotificationTimeout2 = null;

    function createNotification(message, isSuccess) {
        // 如果当前已有通知显示，立即清除以展示新通知
        if (activeNotification) {
            if (activeNotification.parentNode) {
                activeNotification.parentNode.removeChild(activeNotification);
            }
            clearTimeout(activeNotificationTimeout1);
            clearTimeout(activeNotificationTimeout2);
        }

        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = isSuccess ? 'rgba(0, 128, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)';
        notification.style.color = 'white';
        notification.style.borderRadius = '5px';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        notification.style.zIndex = '2147483647';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.2s ease, top 0.2s ease';

        document.body.appendChild(notification);
        activeNotification = notification;

        // 触发渐入动画
        activeNotificationTimeout1 = setTimeout(function() {
            notification.style.opacity = '1';
        }, 50);

        // 停留时间设为 1300ms
        activeNotificationTimeout2 = setTimeout(function() {
            notification.style.opacity = '0';
            setTimeout(function() {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
                if (activeNotification === notification) {
                    activeNotification = null;
                }
            }, 200);
        }, 1300);
    }

    // ==========================================
    // 功能一：右键快速复制元素内文本
    // ==========================================

    document.addEventListener('contextmenu', function(event) {
        if (!enableCopyOnRightClick) return;

        const target = event.target;
        const tagName = target.tagName.toUpperCase();

        // 排除图片和表单输入类元素
        if (tagName === 'IMG' || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tagName)) {
            return;
        }

        const text = target.textContent.trim();
        if (text) {
            navigator.clipboard.writeText(text).then(function() {
                createNotification('文本已复制到剪贴板', true);
            }).catch(function(err) {
                createNotification('复制文本失败', false);
                console.error('复制文本失败: ', err);
            });
        }
    });

    // ==========================================
    // 功能二：左键拖拽链接/图片在新标签页打开
    // ==========================================

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

    // ==========================================
    // 功能三：鼠标悬停图片快捷操作面板（下载/复制链接/新标签页打开）
    // ==========================================

    // 清理图片 URL 中的参数
    function processImageUrl(src) {
        if (!src) return '';
        if (src.startsWith('data:')) return src;
        if (STRIP_IMAGE_URL_PARAMS) {
            try {
                const url = new URL(src);
                url.search = '';
                url.hash = '';
                return url.toString();
            } catch (e) {
                console.error('清理图片 URL 参数失败:', e);
            }
        }
        return src;
    }

    // 注入页面全局样式
    const style = document.createElement('style');
    style.textContent = `
        /* 强制图片响应鼠标事件，防止通过 pointer-events: none 导致悬停失效 */
        img {
            pointer-events: auto !important;
        }
        .web-mouse-helper-action-panel {
            position: absolute;
            z-index: 2147483647;
            display: none;
            flex-direction: row;
            gap: 4px;
            background-color: rgba(0, 0, 0, 0.55);
            padding: 4px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            backdrop-filter: blur(4px);
            transition: opacity 0.2s;
        }
        .web-mouse-helper-action-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background-color: transparent;
            color: #ffffff;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.1s;
            border: none;
            padding: 0;
        }
        .web-mouse-helper-action-btn:hover {
            background-color: rgba(255, 255, 255, 0.2);
            transform: scale(1.08);
            color: #ffffff;
        }
        .web-mouse-helper-action-btn:active {
            transform: scale(0.92);
        }
        .web-mouse-helper-action-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }
    `;
    document.head.appendChild(style);

    // 创建单例操作面板 DOM 并插入 body
    const actionPanel = document.createElement('div');
    actionPanel.className = 'web-mouse-helper-action-panel';
    actionPanel.innerHTML = `
        <button class="web-mouse-helper-action-btn" id="wmh-open-btn" title="在新标签页中打开图片">
            <svg viewBox="0 0 24 24">
                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
        </button>
        <button class="web-mouse-helper-action-btn" id="wmh-copy-btn" title="复制图片地址">
            <svg viewBox="0 0 24 24">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
        </button>
        <button class="web-mouse-helper-action-btn" id="wmh-download-btn" title="下载图片">
            <svg viewBox="0 0 24 24">
                <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/>
            </svg>
        </button>
    `;
    document.body.appendChild(actionPanel);

    const openBtn = actionPanel.querySelector('#wmh-open-btn');
    const copyBtn = actionPanel.querySelector('#wmh-copy-btn');
    const downloadBtn = actionPanel.querySelector('#wmh-download-btn');

    let hoverImg = null;
    let hideTimeout = null;

    // 显示操作面板
    function showPanel(img) {
        if (!enableImageDownload) return;

        // 获取图片尺寸限制，若未加载完成则获取当前渲染大小
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;

        // 过滤微小图片/图标（宽度小于80px，高度小于50px，通常不是内容图片）
        if (width < 200 || height < 200) return;

        hoverImg = img;
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }

        updatePanelPosition();
        actionPanel.style.display = 'flex';
    }

    // 更新面板定位
    function updatePanelPosition() {
        if (!hoverImg) return;
        const rect = hoverImg.getBoundingClientRect();
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;

        // 面板的估计尺寸（宽约100px，高约36px）
        const panelWidth = 100;
        const panelHeight = 36;
        const margin = 8;
        const top = rect.bottom + scrollY - panelHeight - margin;
        const left = rect.left + scrollX + margin;

        actionPanel.style.top = `${top}px`;
        actionPanel.style.left = `${left}px`;
    }

    // 延迟隐藏面板，留出时间供鼠标滑动到面板上
    function hidePanel() {
        if (hideTimeout) return;
        hideTimeout = setTimeout(() => {
            actionPanel.style.display = 'none';
            hoverImg = null;
        }, 300);
    }

    // 事件监听（事件委托）
    document.addEventListener('mouseover', function(event) {
        const target = event.target;
        if (target.tagName === 'IMG') {
            showPanel(target);
        }
    });

    document.addEventListener('mouseout', function(event) {
        const target = event.target;
        if (target.tagName === 'IMG') {
            hidePanel();
        }
    });

    // 鼠标在面板上方时保持显示
    actionPanel.addEventListener('mouseover', function() {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
    });

    actionPanel.addEventListener('mouseout', function() {
        hidePanel();
    });

    // 滚动页面时实时同步位置，保证面板贴合图片
    window.addEventListener('scroll', function() {
        if (actionPanel.style.display === 'flex' && hoverImg) {
            updatePanelPosition();
        }
    }, { passive: true });

    // 通用下载回退机制（在 GM_download 出现限制时使用 Blob 机制）
    function fallbackDownload(url, filename) {
        fetch(url)
            .then(response => response.blob())
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
                createNotification('图片下载成功', true);
            })
            .catch(err => {
                createNotification('图片下载失败', false);
                console.error('回退下载失败:', err);
            });
    }

    // 按钮动作监听 1：在新标签页中打开
    openBtn.addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        if (!hoverImg || !hoverImg.src) return;
        const finalUrl = processImageUrl(hoverImg.src);
        window.open(finalUrl, '_blank');
    });

    // 按钮动作监听 2：复制图片地址
    copyBtn.addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        if (!hoverImg || !hoverImg.src) return;
        const finalUrl = processImageUrl(hoverImg.src);
        navigator.clipboard.writeText(finalUrl).then(function() {
            createNotification('图片地址已复制到剪贴板', true);
        }).catch(function(err) {
            createNotification('复制图片地址失败', false);
            console.error('复制图片地址失败: ', err);
        });
    });

    // 按钮动作监听 3：下载图片
    downloadBtn.addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();

        if (!hoverImg || !hoverImg.src) return;

        const src = processImageUrl(hoverImg.src);

        // 获取文件名
        let filename = 'downloaded_image';
        try {
            if (src.startsWith('data:')) {
                // Base64 Data URL 下载逻辑
                const mime = src.match(/data:([^;]+);/);
                const ext = mime ? mime[1].split('/')[1] : 'png';
                filename = `image_${Date.now()}.${ext}`;

                const a = document.createElement('a');
                a.href = src;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                createNotification('图片下载成功', true);
                return;
            } else {
                // 从常规 URL 中提取文件名
                const url = new URL(src);
                const pathname = url.pathname;
                let baseName = pathname.substring(pathname.lastIndexOf('/') + 1);
                if (baseName) {
                    if (!baseName.includes('.')) {
                        baseName += '.png';
                    }
                    filename = decodeURIComponent(baseName);
                } else {
                    filename = `image_${Date.now()}.png`;
                }
            }
        } catch (e) {
            console.error('文件名解析失败:', e);
            filename = `image_${Date.now()}.png`;
        }

        // 优先使用油猴专用的 GM_download API（解决跨域限制）
        if (typeof GM_download === 'function') {
            GM_download({
                url: src,
                name: filename,
                onload: function() {
                    createNotification('图片下载成功', true);
                },
                onerror: function(err) {
                    console.warn('GM_download 失败，尝试使用 fetch 回退方案:', err);
                    fallbackDownload(src, filename);
                }
            });
        } else {
            fallbackDownload(src, filename);
        }
    });
})();
