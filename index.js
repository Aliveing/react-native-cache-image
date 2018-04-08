'use strict';
import React from 'react';
import API from '../../network/Api';
// import Util from '../../utils/Util';
import {
    Image,
    Alert,
    StyleSheet,
    Platform,
    View,
    TextInput,
    LayoutAnimation
} from 'react-native';
const RNFS = require('react-native-fs');
const MAIN_PATH = Platform.select({
    ios: RNFS.DocumentDirectoryPath,
    android: RNFS.ExternalDirectoryPath
});
const CacheStatus = {
    EMPTY: 0,
    DOWNLOADING: 1,
    DOWNLOADED: 2
};
global.CacheImageInstances = {}; // 缓存图片实例
const CACHE_PATH = MAIN_PATH + '/imageCaches';
import Icons from '../../css/Icons';

class CacheImage extends React.Component {

    constructor(props) {
        super(props);
        if (typeof props.source === 'object') {
            console.log(`START============= new instance ${props.source.url} =============`);
            let { is_private, cache, max_oss_path, oss_path, url, size, is_cdn } = props.source;
            this.is_private = is_private;
            this.is_cdn = is_cdn;
            this.max_oss_path = max_oss_path;
            if (max_oss_path || oss_path) {
                this.is_private = is_private || true;
            }
            this.oss_path = oss_path;
            this.url = url;
            this.size = size;
            this._downloading = false;

            this._cacheImagePath = '';

            this._preImageCachePath = this.generatePreImagePath();
            this._isCacheImageExist = false;

            this.addInstance();
            // this.saveInGlobalQueues();
        }
        this.state = {
            cacheSource: Icons.nophoto,
            key: 0
        };
    }

    componentDidMount() {
        this._mounted = true;
        this.props.source && this.getPic();
    }

    componentWillUnmount() {
        this._mounted = false;
    }

    generatePreImagePath() {
        let url = this.is_private && this.is_cdn ? (this.max_oss_path || this.oss_path || this.url) : this.url;
        let signal = url.replace(/^(http:|https:)\/\//, '');
        let imageType = signal.match(/\.[a-z]+$/);
        imageType = imageType ? imageType[0] : '.png';
        signal = signal.replace(/\.[a-z]+$/, '');
        signal = signal.split('.').join('_');
        signal = signal.split('/').join('_');
        let path = `${CACHE_PATH}/${signal}${imageType}`;
        return path;
    }

    addInstance() {
        global.CacheImageInstances[this._preImageCachePath] = CacheStatus.EMPTY;
    }

    getInstanceStatus(status) {
        return global.CacheImageInstances[this._preImageCachePath];
    }

    setInstanceStatus(status) {
        global.CacheImageInstances[this._preImageCachePath] = status;
    }

    log(msg) {
        console.log(`============= ${msg} =============`);
    }

    logEnd() {
        this.hideModal();
        console.log(`END============= new instance ${this.url} =============`);
    }

    /**
     * @description 
     * @param {any} pic 
     * @memberof CacheImage
     */
    async getPic() {
        let me = this;
        me.log('start get pic');
        me.showModal();
        let isCacheImageExist = await CacheImage.isPathExist(me._preImageCachePath);
        if (!isCacheImageExist) {
            me.log('cache image path is not exist');
            me.cacheImage();
            return;
        }
        me.log(`return cache path ${me._preImageCachePath}`)
        me.logEnd();
        me._cacheImagePath = { uri: me._preImageCachePath };
        me.setSource();
    }

    setSource = (cb) => {
        let me = this;
        if (!me._mounted) {
            me.log('组件已被移除，不重新渲染');
            return;
        }
        if (me._cacheImagePath.uri === me.state.cacheSource) {
            me.log('相同路径图片，将不会重新渲染');
            return;
        }
        let cacheSource = { uri: Platform.select({ android: 'file://' }) + me._cacheImagePath.uri };
        console.log(cacheSource);
        me.setState({
            cacheSource: cacheSource,
            key: me.generateKey()
        }, () => {
            typeof cb === 'function' && cb();
        });
    }

    generateKey() {
        let key = this.state.key;
        key += 1;
        key = key < 10 ? key : 0;
        return key;
    }

    getPicKey() {
        if (!this.url) { return '' }
        let { is_private, max_oss_path, oss_path, url, is_cdn } = this;
        let picKey = is_private && is_cdn ? (max_oss_path || oss_path) : url;
        return picKey;
    }

    // getCacheImagePath() {
    //     let me = this;
    //     return new Promise(resolve => {
    //         global.storage.load({
    //             key: 'imageCaches'
    //         }).then(data => {
    //             resolve(data[me.getPicKey()]);
    //         }).catch(e => {
    //             resolve(null);
    //         });
    //     });
    // }

    // saveCacheImagePath(cacheUrl) {
    //     let me = this;
    //     let picKey = me.getPicKey();
    //     let newCacheImage = {};
    //     newCacheImage[picKey] = cacheUrl;
    //     me.log(`${JSON.stringify(newCacheImage)} - End`);
    //     global.storage.load({
    //         key: 'imageCaches'
    //     }).then(data => {
    //         me.saveCacheImageIntoStorage({...data, ...newCacheImage });
    //     }).catch(e => {
    //         console.log(e);
    //         me.saveCacheImageIntoStorage(newCacheImage);
    //     });
    //     me.logEnd();
    // }

    saveCacheImageIntoStorage(newData) {
        let me = this;
        global.storage.save({
            key: 'imageCaches',
            data: newData
        }).then(s => {
            me._downloading = false;
            CacheImage.removeCacheImageQueues(me);
        }).catch(e => {
            console.log(e);
        });
    }

    static isPathExist(path) {
        if (!path) return false;
        return new Promise(resolve => {
            RNFS.exists(path).then(isExist => {
                resolve(isExist);
            }).catch(e => {
                console.log(e);
                resolve(false)
            })
        });
    }

    createCachePath() {
        let me = this;
        return new Promise(resolve => {
            RNFS.mkdir(CACHE_PATH).then(done => {
                me.log(`未找到缓存路径(${CACHE_PATH}), 创建缓存目录`);
                resolve(done);
            }).catch(e => {
                resolve(false);
            })
        })
    }

    getImageFilePath() {
        return `${CACHE_PATH}/${this.url}`;
    }

    /**
     * @description 
     * @param {object} pic 图片对象
     * @memberof CacheImage
     */
    async cacheImage() {
        let me = this;
        if (me.getInstanceStatus() !== CacheStatus.EMPTY) {
            return false;
        }
        me.setInstanceStatus(CacheStatus.DOWNLOADING);
        me.log('start download image')
        let picConfig = me.getPicUrl();
        let { url } = picConfig;

        let checkCacheDir = await CacheImage.isPathExist(CACHE_PATH);
        me.log(`check cache folder is exist ? ${checkCacheDir}`);
        if (!checkCacheDir) {
            await me.createCachePath();
        }


        let imagePath = me._preImageCachePath;
        let checkCacheImageFile = await CacheImage.isPathExist(imagePath);
        me.log(`check cache image is exist ? ${checkCacheImageFile}`);
        if (checkCacheImageFile) {
            return false;
        }

        me.log(`download image (${url}) to (${imagePath})`);
        let downloaded = await new Promise(resolve => {
            RNFS.downloadFile({
                fromUrl: url,
                toFile: imagePath,
                background: true,
                progressDivider: 1,
                begin: (beginCallback) => {
                    console.log(beginCallback);
                    me.log('begin download');
                },
                progress: (progressCallback) => {
                    me.onProgress(progressCallback);
                }
            }).promise.then((response) => {
                if (response.statusCode === 200) {
                    me.log('download complete');
                    resolve(true);
                } else {
                    me.log('download failed');
                    CacheImage.clearCache(imagePath, false);
                    me.setInstanceStatus(CacheStatus.EMPTY);
                    resolve(false);
                }
            }).catch(e => {
                me.log(`download failed. Reason: ${e.message}`)
                CacheImage.clearCache(imagePath, false);
                me.setInstanceStatus(CacheStatus.EMPTY);
                resolve(false);
            })
        });
        if (downloaded) {
            me.setInstanceStatus(CacheStatus.DOWNLOADED);
            me.log('save async storage wait next time to use');
            me.logEnd();
            me._cacheImagePath = { uri: imagePath };
            me.setSource();
            // me.saveCacheImagePath(imagePath);
        }
    }

    /**
     * @description 获取图片路径
     * @param {any} pic 
     * @returns  
     * @memberof CacheImage
     */
    getPicUrl() {
        if (!this.url) {
            return '';
        }
        let { url, is_cdn, is_private, max_oss_path, oss_path } = this;
        let picUrl = url;
        if (is_cdn && is_private) {
            let signatureUrl = max_oss_path || oss_path;
            var process = [];
            // NOTE: 此为加密图片需要自行实现生成加密链接
            picUrl = signatureUrl;
            // picUrl = Util.signatureUrl(signatureUrl, process);
        } else {
            picUrl = /^http/.test(url) ? url : API.HOST + url;
        }
        return {
            url: picUrl, //下载路径
            is_private: is_private, // 是否为加密图片
            max_oss_path: max_oss_path, // 获取加密图片缓存路径的标志之一
            oss_path: oss_path // 获取加密图片缓存路径的标志之二
        }
    }

    /**
     * @description 清空图片缓存
     * @memberof CacheImage
     */
    static async clearCache(path = CACHE_PATH, needAlert = true) {
        let checkCacheDir = await CacheImage.isPathExist(path);
        if (checkCacheDir) {
            RNFS.unlink(path).then(res => {
                needAlert && Alert.alert('缓存清除成功');
            }).catch(e => {
                console.log(e);
                needAlert && Alert.alert('缓存清除成功');
            });
        } else {
            needAlert && Alert.alert('缓存清除成功');
        }
    }

    static async getCacheSize(path = CACHE_PATH) {
        let checkCacheDir = await CacheImage.isPathExist(path);
        let size = 0;
        if (checkCacheDir) {
            size = await new Promise(resolve => {
                RNFS.readDir(path).then(readDirItem => {
                    let currentPathSize = 0;
                    readDirItem.map(item => {
                        currentPathSize += item.size;
                    });
                    resolve(currentPathSize);
                }).catch(e => {
                    console.log(e);
                    resolve(0);
                });
            });
        }
        return CacheImage.getSuitableSize(size);
    }

    // NOTE: 上面均为缓存图片逻辑
    // NOTE: ==============================我是分割线==============================
    // NOTE: 下面均为缓存进度条的展示逻辑

    _modal = null;
    _progress = null;
    _progressText = 0;
    _show = false;

    showModal() {
        var me = this;
        var modal = me._modal;
        if (!modal) {
            return;
        }
        modal.setNativeProps({
            style: {
                height: '100%',
                width: '100%'
            }
        });
        setTimeout(() => {
            me._show = true;
        }, 100);
        LayoutAnimation.configureNext({
            duration: 100
        });
        // LayoutAnimation.linear(()=>{
        //     me._show = true;
        // });
    }

    hideModal() {
        var me = this;
        var modal = me._modal;
        if (!modal) {
            return;
        }
        modal.setNativeProps({
            style: {
                height: 0,
                width: 0
            }
        });
        me.resetProgress();
        // LayoutAnimation.linear();
        LayoutAnimation.configureNext({
            duration: 100
        }, () => {
            me._show = false;
        });
    }

    static getSuitableSize(value = 0) {
        var unit = 'Byte', suitable = value;
        const threshold = 0.8;
        if (value / 1024 > threshold) {
            unit = 'KB';
            suitable = value / 1024;
        }
        if (value / 1024 / 1024 > threshold) {
            unit = 'MB';
            suitable = value / 1024 / 1024;
        }
        return `${suitable.round()} ${unit}`;
    }

    changeProgress(ev, total = 0, loaded = 0) {
        var me = this;
        var progress = me._progress;
        var progressText = me._progressText;
        if (!(progress && progressText)) {
            return
        }
        progress.setNativeProps({
            style: {
                width: `${ev}%`
            }
        });
        progressText.setNativeProps({
            text: `${ev}% (${CacheImage.getSuitableSize(loaded)}/${CacheImage.getSuitableSize(total)})`
        });
        LayoutAnimation.linear();
    }
    resetProgress() {
        this._pre_percent = 0;
        this._modal = null;
        this._progress = null;
        this._progressText = 0;
        this._show = false;
    }

    _pre_percent = 0;
    onProgress(e) {
        var total = e.contentLength;
        var loaded = e.bytesWritten;
        var percent = parseFloat((loaded / total * 100).round());
        if (percent - this._pre_percent > 1) {
            this._pre_percent = percent;
            this._show && this.changeProgress(percent, total, loaded);
        }
    }

    render() {
        let me = this;
        let { cacheSource, key } = me.state;
        return <View>
            <Image
                {...me.props}
                key={`image_cache_${key}_${me._cacheImagePath}`}
                source={cacheSource}
            />
            <View
                removeClippedSubviews
                style={styles.modal}
                ref={comp => { me._modal = comp; }}
            >
                {/*<TouchableOpacity style={styles.reload}>
                    <Text style={{color:'white'}}>重新加载</Text>
                </TouchableOpacity>*/}
                <View
                    key="progress"
                    style={styles.progress}
                    ref={comp => {
                        me._progress = comp;
                    }}
                />
                <TextInput
                    key="progress_text"
                    style={styles.progressText}
                    ref={comp => {
                        me._progressText = comp;
                    }}
                    editable={false}
                    defaultValue={'0.00% ( 0 KB/0 KB )'}
                />

            </View>
        </View>
    }
}

const styles = StyleSheet.create({
    modal: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexDirection: 'column',
        paddingLeft: 5,
        paddingRight: 5,
    },
    progress: {
        backgroundColor: 'rgba(255,255,255,0.5)',
        height: 10,
        alignSelf: 'flex-start',
        width: '1%',
    },
    progressText: {
        width: '100%',
        textAlign: 'center',
        color: 'white',
        fontSize: 12
    },
    reload: {
        height: 25,
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
    }
});

export default CacheImage;
