/**
* @program: server
*
* @description:
*
* @author: lemo
*
* @create: 2019-11-05 19:34
**/

package app

import (
	"github.com/Lemo-yxk/lemo"
)

var App struct {
	socket   *lemo.WebSocketServer
	electron *electron
	react    *react
	runner   *runner
}

func Init() {
	App.socket = newSocket()
	App.electron = newElectron()
	App.react = newReact()
	App.runner = newRunner()
}

func Socket() *lemo.WebSocketServer {
	return App.socket
}

func React() *react {
	return App.react
}

func Electron() *electron {
	return App.electron
}

func Runner() *runner {
	return App.runner
}
