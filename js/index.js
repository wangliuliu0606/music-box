var EventCenter = {
  on: function(type,handler){
    $(document).on(type,handler)
  },
  fire: function(type,data){
    $(document).trigger(type,data)
  }
}

var Footer = {
  init: function(){
    var _this = this
    this.$footer = $('footer')
    this.$box = this.$footer.find('.box')
    this.$ul = this.$footer.find('ul')
    this.$li = this.$box.find('li')
    this.isAnimate = false
    this.isEnd = false
    this.isStart = true
    this.bind()
    this.getData(function(data){
      _this.render(data)
    })
  },

  bind: function(){
    var _this = this
    this.$footer.find('.right').click(function(){
      if(_this.isAnimate) return
      var itemsWidth = _this.$footer.find('li').outerWidth(true)
      var dist = Math.floor(_this.$box.width() / itemsWidth)
      if(!_this.isEnd){
        _this.isAnimate = true
        _this.$ul.animate({
          left: '-=' + dist * itemsWidth + 'px'
        },500,function(){
          _this.isAnimate = false
          _this.isStart = false
          if(_this.$box.width() - parseFloat(_this.$ul.css('left')) > _this.$ul.width()){
            _this.isEnd = true
          }
        })
      }
    })

    this.$footer.find('.left').click(function(){
      if(_this.isAnimate) return
      var itemsWidth = _this.$footer.find('li').outerWidth(true)
      var dist = Math.floor(_this.$box.width() / itemsWidth)
      if(!_this.isStart){
        _this.isAnimate = true
        _this.$ul.animate({
          left: '+=' + dist * itemsWidth + 'px'
        },500,function(){
          _this.isAnimate = false
          _this.isEnd = false
          if(parseFloat(_this.$ul.css('left')) >= -1){
            _this.isStart = true
          }
        })
      }
    })

    this.$footer.on('click','li',function(){
      $(this).addClass('actives')
             .siblings().removeClass('actives')

      EventCenter.fire('select-albumn',{
        channelId: $(this).attr('data-channel-id'),
        channelName: $(this).attr('data-channel-name')
      })
    })

  },

  getData: function(callback){
    $.ajax({
      url: 'https://jirenguapi.applinzi.com/fm/getChannels.php',
      type: 'GET',
      dataType: 'json',
    }).done(function(ret){
      callback(ret.channels)
    }).fail(function(){
      console.log('获取数据失败...')
    })
  },

  render: function(datas){
    var _this = this
    var html =''
    datas.unshift({
      channel_id: 0,
      name: '我的最爱',
      cover_small: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-small',
      cover_middle: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-middle',
      cover_big: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-big',
    })
    datas.forEach(function(data){
      html += '<li data-channel-id='+data.channel_id+' data-channel-name='+data.name+'>'
      html += '<div class="cover" style="background-image:url('+data.cover_small+')"></div>'
      html += '<h3>'+data.name+'<h3>'
      html += '</li>'
    })
    this.$ul.html(html)
    this.setStyle()
  },

  setStyle: function(){
    var count = this.$ul.find('li').length
    var width = this.$ul.find('li').outerWidth(true)
    this.$ul.css({
      width: count * width + 'px'
    })
  }
}

var Fm = {
  init: function(){
    this.audio = new Audio()
    this.audio.autoplay = true
    this.$homePage = $('#home-page')
    this.clock = null
    this.currentSong = null
    this.collections = this.loadFromLocal()
    this.bind()
  },

  bind: function(){
    var _this = this
    EventCenter.on('select-albumn',function(e,channelObj){
      console.log(channelObj.channelId)
      _this.channelId = channelObj.channelId
      _this.channelName = channelObj.channelName
      _this.getMusic()
    })

    this.$homePage.find('.btn-play').click(function(){
      if($(this).hasClass('icon-play')){
        $(this).removeClass('icon-play').addClass('icon-stop')
        _this.audio.play()
      }else{
        $(this).removeClass('icon-stop').addClass('icon-play')
        _this.audio.pause()
      }
    })

    this.$homePage.find('.btn-up').on('click',function(){
      _this.getMusic()
    })

    this.audio.addEventListener('play',function(){
      console.log('play')
      _this.$homePage.find('.btn-play').removeClass('icon-play').addClass('icon-stop')
      clearInterval(_this.clock)
      _this.clock = setInterval(function(){
        _this.updateTime()
      },1000)
    })

    this.audio.addEventListener('pause',function(){
      console.log('pause')
      _this.$homePage.find('.btn-play').removeClass('icon-stop').addClass('icon-play')
      clearInterval(_this.clock)
    })

    this.audio.addEventListener('ended',function(){
      _this.getMusic()
    })

    this.$homePage.find('.bar').on('click',function(e){
      var percentage = e.offsetX/parseFloat($(this).css('width'))
      _this.audio.currentTime = percentage * _this.audio.duration
    })

    this.$homePage.find('.btn-love').click(function(){
      if($(this).hasClass('active')){
        $(this).removeClass('active')
        delete _this.collections[_this.currentSong.sid]
      }else{
        $(this).addClass('active')
        _this.collections[_this.currentSong.sid] = _this.currentSong
      }
      _this.saveToLocal()
    })
  },

  getMusic: function(){
    var _this = this
    if(this.channelId === '0'){
      _this.loadCollection()
    }else{
      $.ajax({
        url: 'https://jirenguapi.applinzi.com/fm/getSong.php',
        type: 'GET',
        data: {
          channel: this.channelId
        },
        dataType: 'json'
      }).done(function(ret){
        console.log(ret)
        _this.setMusic(ret.song[0]||null)
      }).fail(function(){
        console.log('获取数据失败...')
      })
    }
  },

  getLyric: function(sid){
    var _this = this
    $.ajax({
      url: 'https://jirenguapi.applinzi.com/fm/getLyric.php',
      type: 'GET',
      data: {
        sid: sid
      },
      dataType: 'json'
    }).done(function(ret){
      var lyric = ret.lyric
      var lyricObj = {}
      lyric.split(/\n/).forEach(function(line){
        var timeArr = line.match(/\d{2}:\d{2}/g)
        if(timeArr){
          timeArr.forEach(function(time){
            lyricObj[time] = line.replace(/\[.+?\]/g,'')
          })
        }
      })
      _this.lyricObj = lyricObj
    })
  },

  setMusic: function(song){
    console.log(song)
    this.currentSong = song
    this.audio.src = song.url
    $('.bg').css('background-image','url('+song.picture+')')
    this.$homePage.find('figure').css('background-image','url('+song.picture+')')
    this.$homePage.find('.typ').text(this.channelName)
    this.$homePage.find('h2').text(song.title)
    this.$homePage.find('.author').text(song.artist)
    if(this.collections[song.sid]){
      this.$homePage.find('.btn-love').addClass('active')
    }else{
      this.$homePage.find('.btn-love').removeClass('active')
    }
    this.getLyric(song.sid)
  },

  updateTime: function(){
    var schedule = this.audio.currentTime / this.audio.duration * 100 + '%'
    var min = Math.floor(this.audio.currentTime/60) + ':'
    var second = Math.floor(this.audio.currentTime % 60) + ''
    second = second.length === 2 ? second : '0' + second
    this.$homePage.find('.now-time').text(min+second)
    this.$homePage.find('.bar-son').css('width',schedule)
    if(this.lyricObj){
      var lyric = this.lyricObj['0' + min + second]
      if(lyric){
        this.$homePage.find('.lyrics p').text(lyric).boomText('fadeInDown')
      }
    }
  },

  loadFromLocal: function(){
    return JSON.parse(localStorage['collections']||'{}')
  },

  saveToLocal: function(){
    localStorage['collections'] = JSON.stringify(this.collections)

  },

  loadCollection: function(){
    var keyArray = Object.keys(this.collections)
    if(keyArray.length === 0) return
    var randomIndex = Math.floor(Math.random()* keyArray.length)
    var randomSid = keyArray[randomIndex]
    this.setMusic(this.collections[randomSid])
  },
}

$.fn.boomText = function(type){
  type = type || 'rollIn'
  this.html(function(){
    var arr = $(this).text().split('')
    var newArr = []
    arr.forEach(function(e){
      var word = '<span class="boomText">'+ e +'</span>'
      newArr.push(word)
    })
    return newArr.join('')
  })

  var index = 0
  var $boomText = $(this).find('span')
  var clock = setInterval(function(){
    $boomText.eq(index).addClass('animated ' + type)
    index++
    if(index >= $boomText.length){
      clearInterval(clock)
    }
  },100)
}

Fm.init()
Footer.init()