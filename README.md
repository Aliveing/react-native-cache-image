# 缓存图片 - React Native
### 如果你想找一个使用 npm install 的组件，建议使用[react-native-img-cache](https://github.com/wcandillon/react-native-img-cache)
> 这不能直接npm install 使用，需要自行修改，如果有时间会改成通用组件

### 使用前强烈建议阅读 [react-native-fs](https://github.com/itinance/react-native-fs)组件
IOS图片会缓存到 RNFS.DocumentDirectoryPath/imageCaches/, android会缓存到 RNFS.ExternalDirectoryPath/imageCaches/

### 使用方法

     <CacheImage 
        {...Image.propTypes} 
        source={source} 
    />
### **source**: Object{}

    url: 'xxxxx', //图片路径
    is_cdn: false, // 是否为cdn
    is_private: false, // *是否为加密链接的图片
    max_oss_path: '', // *加密大图链接
    oss_path: '' // *加密普通图链接
> *代表此属性不为必要存在属性
### **清除缓存** : static clearCache(): Promise < void >

    CacheImage.clearCache(); // 删除对应的缓存目录, 清除完会自己Alert提示
### **获取缓存大小** : static getCacheSize(): Promise < string >

    CacheImage.getCacheSize().then(cacheSize => {
        // DO Everything You Wanna
        // 建议用state来控制刷新或者也可以用setNativeProps赋值TextInput
    });
### TODO
> 因为代码里没写注释(真是万恶)，先看着吧... 后期补上，不过有比较详细的log输出，各位大哥大姐(等等，大姐？)可以开Debug JS或者到AS和xcode的控制台看看
* [ ] 有时间把注释加上 
* [ ] 有时间改成通用组件 
* [ ] source 新增 cache 属性，判断是否要缓存